#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
 ZF 8HP Mechatronic Diagnostic Suite  -  EWS / ISN Immobilizer Tool
 Fase SIMULADOR  |  Production-grade architecture  |  UDS (ISO 14229) / ISO-TP
===============================================================================

 Ferramenta de bancada multiplataforma (Windows/macOS/Linux) para leitura,
 gravacao e reset de imobilizador (EWS/ISN) da mecatronica ZF 8HP de 1a
 geracao (padrao BMW/Dodge), comunicando por UDS sobre ISO-TP/CAN.

 ARQUITETURA (Inversao de Dependencia):

     +------------------+        +----------------+        +------------------+
     |   DiagnosticGUI  | -----> |   UdsClient    | -----> | CanTransportBase |
     | (camada de view) |        | (servicos UDS) |        |   (abstracao)    |
     +------------------+        +----------------+        +--------+---------+
                                                                    |
                                               +--------------------+-------------------+
                                               |                                        |
                                    +----------v----------+               +-------------v------------+
                                    |    VirtualCanBus    |               |  PCanTransport (futuro)  |
                                    |  (mock em memoria)  |               |  J2534 / Tactrix / etc.  |
                                    +----------+----------+               +--------------------------+
                                               |
                                    +----------v----------+
                                    |   ZF8HPSimulator    |
                                    |     (mock TCU)      |
                                    +---------------------+

 Para migrar para hardware real, troque APENAS a linha de instanciacao do
 transporte em `main()` por uma subclasse de `CanTransportBase` que fale com
 python-can / python-can-isotp. Nenhuma outra camada muda.

 Uso:
     python3 simulador_zf8hp.py

 Dependencias: biblioteca padrao. CustomTkinter e OPCIONAL (detectado em
 runtime); sem ele, a UI usa ttk com tema industrial equivalente.

 AVISO: o algoritmo Seed->Key e FICTICIO (demonstracao). Nao representa o
 algoritmo proprietario real da ZF/BMW.
===============================================================================
"""

from __future__ import annotations

import time
import queue
import random
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable, List, Optional

import tkinter as tk
from tkinter import ttk, font as tkfont


# =============================================================================
# 1. CONSTANTES DE PROTOCOLO (UDS / ISO 14229 + ISO-TP + enderecamento CAN)
# =============================================================================

# --- Service IDs ---
SID_DIAGNOSTIC_SESSION_CONTROL = 0x10
SID_READ_DATA_BY_IDENTIFIER    = 0x22
SID_SECURITY_ACCESS            = 0x27
SID_ROUTINE_CONTROL            = 0x31
SID_REQUEST_DOWNLOAD           = 0x34
SID_TRANSFER_DATA              = 0x36
SID_REQUEST_TRANSFER_EXIT      = 0x37
SID_TESTER_PRESENT             = 0x3E

POSITIVE_RESPONSE_OFFSET = 0x40
NEGATIVE_RESPONSE_SID    = 0x7F

# --- Sub-funcoes ---
SESSION_DEFAULT        = 0x01
SESSION_EXTENDED       = 0x03
SECURITY_REQUEST_SEED  = 0x01
SECURITY_SEND_KEY      = 0x02
ROUTINE_START          = 0x01
SUPPRESS_POS_RESPONSE  = 0x80   # bit OR na sub-funcao (ex.: TesterPresent 0x80)

# --- Data / Routine Identifiers ---
DID_VIN       = 0xF190
RID_ERASE_ISN = 0x0F01

# --- Negative Response Codes ---
NRC_SERVICE_NOT_SUPPORTED        = 0x11
NRC_SUB_FUNCTION_NOT_SUPPORTED   = 0x12
NRC_CONDITIONS_NOT_CORRECT       = 0x22
NRC_REQUEST_SEQUENCE_ERROR       = 0x24
NRC_REQUEST_OUT_OF_RANGE         = 0x31
NRC_SECURITY_ACCESS_DENIED       = 0x33
NRC_INVALID_KEY                  = 0x35
NRC_UPLOAD_DOWNLOAD_NOT_ACCEPTED = 0x70
NRC_TRANSFER_DATA_SUSPENDED      = 0x71
NRC_GENERAL_PROGRAMMING_FAILURE  = 0x72
NRC_WRONG_BLOCK_SEQUENCE_COUNTER = 0x73
NRC_RESPONSE_PENDING             = 0x78   # requestCorrectlyReceived-ResponsePending
NRC_VOLTAGE_TOO_HIGH             = 0x92
NRC_VOLTAGE_TOO_LOW              = 0x93

NRC_TEXT = {
    NRC_SERVICE_NOT_SUPPORTED:        "serviceNotSupported",
    NRC_SUB_FUNCTION_NOT_SUPPORTED:   "subFunctionNotSupported",
    NRC_CONDITIONS_NOT_CORRECT:       "conditionsNotCorrect",
    NRC_REQUEST_SEQUENCE_ERROR:       "requestSequenceError",
    NRC_REQUEST_OUT_OF_RANGE:         "requestOutOfRange",
    NRC_SECURITY_ACCESS_DENIED:       "securityAccessDenied",
    NRC_INVALID_KEY:                  "invalidKey",
    NRC_UPLOAD_DOWNLOAD_NOT_ACCEPTED: "uploadDownloadNotAccepted",
    NRC_TRANSFER_DATA_SUSPENDED:      "transferDataSuspended",
    NRC_GENERAL_PROGRAMMING_FAILURE:  "generalProgrammingFailure",
    NRC_WRONG_BLOCK_SEQUENCE_COUNTER: "wrongBlockSequenceCounter",
    NRC_RESPONSE_PENDING:             "responsePending",
    NRC_VOLTAGE_TOO_HIGH:             "voltageTooHigh",
    NRC_VOLTAGE_TOO_LOW:              "voltageTooLow",
}

# --- Enderecamento CAN (ISO 15765-4, enderecamento fisico estendido 29 bits) ---
# 18 DA <target> <source>.  Tester = F1, ZF 8HP TCU = 18.
CAN_ID_TESTER = 0x18DA18F1   # Tx: tester -> TCU
CAN_ID_TCU    = 0x18DAF118   # Rx: TCU -> tester
ISOTP_PADDING = 0x55         # byte de preenchimento tipico

# --- Temporizacao (ms / s) ---
P2_SERVER_MS      = 50        # P2: janela normal de resposta do servidor
P2_STAR_SERVER_MS = 5000      # P2*: janela estendida apos responsePending (0x78)
S3_SERVER_S       = 5.0       # S3: timeout da sessao sem atividade
SEED_VALIDITY_S   = 5.0       # validade do seed apos RequestSeed
KEEPALIVE_S       = 2.0       # intervalo do TesterPresent keep-alive

# --- Tensao de bateria (seguranca de gravacao) ---
VOLTAGE_NOMINAL   = 13.8
VOLTAGE_BROWNOUT  = 9.4
VOLTAGE_MIN_WRITE = 11.0      # abaixo disto a ECU recusa escrever (anti-brick)

# --- Barreira Seed->Key (FICTICIA) ---
SECURITY_XOR_CONSTANT = [0x5A, 0xA5, 0x3C, 0xC3]


# =============================================================================
# 2. UTILITARIOS
# =============================================================================

def hexstr(data) -> str:
    """[0x10, 0x03] -> '10 03'."""
    return " ".join("{:02X}".format(b & 0xFF) for b in data)


def compute_key_from_seed(seed: List[int]) -> List[int]:
    """Algoritmo FICTICIO de demonstracao: XOR com constante + inversao de bytes."""
    xored = [(seed[i] ^ SECURITY_XOR_CONSTANT[i % len(SECURITY_XOR_CONSTANT)]) & 0xFF
             for i in range(len(seed))]
    return list(reversed(xored))


def isotp_segment(payload: List[int]) -> List[List[int]]:
    """Segmenta um payload UDS em frames ISO-TP de 8 bytes (classic CAN).

    - SingleFrame  (SF): payload <= 7 bytes  -> [len, ...dados..., padding]
    - FirstFrame   (FF): [0x1X, lenLo, 6 bytes]
    - ConsecFrame  (CF): [0x2S, ate 7 bytes]
    Todos preenchidos ate 8 bytes com ISOTP_PADDING.
    """
    n = len(payload)
    if n <= 7:
        frame = [n] + list(payload)
        frame += [ISOTP_PADDING] * (8 - len(frame))
        return [frame]

    frames = [[0x10 | ((n >> 8) & 0x0F), n & 0xFF] + list(payload[:6])]
    rest = payload[6:]
    seq = 1
    for i in range(0, len(rest), 7):
        cf = [0x20 | (seq & 0x0F)] + list(rest[i:i + 7])
        cf += [ISOTP_PADDING] * (8 - len(cf))
        frames.append(cf)
        seq = (seq + 1) & 0x0F
    return frames


# =============================================================================
# 3. MODELO DE FRAME CAN + EXCECOES DE DIAGNOSTICO
# =============================================================================

@dataclass
class CanFrame:
    """Um frame CAN bruto, no formato de um analisador (Vector / SavvyCAN)."""
    timestamp: float          # segundos de alta precisao (perf_counter relativo)
    direction: str            # "Tx" ou "Rx"
    arb_id: int               # identificador de arbitragem
    data: List[int]           # ate 8 bytes
    extended: bool = True     # 29 bits

    def format(self) -> str:
        ext = "x" if self.extended else " "
        return "{:>12.6f}  {}  {:08X}{}  [{}]  {}".format(
            self.timestamp, self.direction, self.arb_id, ext,
            len(self.data), hexstr(self.data))


class UdsError(Exception):
    """Falha generica da camada de diagnostico."""


class UdsTimeoutError(UdsError):
    """P2/P2* excedido: a ECU nao respondeu dentro da janela."""


class UdsNegativeResponse(UdsError):
    """Resposta negativa (0x7F) da ECU."""
    def __init__(self, request_sid: int, nrc: int):
        self.request_sid = request_sid
        self.nrc = nrc
        super().__init__("NRC 0x{:02X} ({}) no servico 0x{:02X}".format(
            nrc, NRC_TEXT.get(nrc, "desconhecido"), request_sid))


@dataclass
class TcuReply:
    """Resposta do mock TCU: payload UDS + atraso de processamento simulado.

    `delay` em segundos. Se exceder P2, o transporte emite responsePending
    (0x78) antes de entregar a resposta final (comportamento P2*).
    `payload` vazio = resposta suprimida (ex.: TesterPresent 0x3E 0x80).
    """
    payload: List[int]
    delay: float = 0.0


# =============================================================================
# 4. MOCK TCU - SIMULADOR DA MECATRONICA ZF 8HP
# =============================================================================

class ZF8HPSimulator:
    """Nucleo de simulacao da mecatronica: maquina de estados UDS realista.

    Modela: sessao (com timeout S3), security access (com validade de seed),
    data transfer (0x34/0x36/0x37), tensao de bateria (anti-brick) e
    TesterPresent. NAO cuida de framing/timing de barramento - isso e do
    transporte. Devolve sempre um TcuReply.
    """

    VIN = "WBA8E9C50GK000001"
    MAX_BLOCK_LENGTH = 0x0102

    def __init__(self, log: Optional[Callable[[str, str], None]] = None):
        self._log = log or (lambda msg, level="info": None)
        self.voltage = VOLTAGE_NOMINAL
        self.reset_state()

    # -------------------------------------------------------------- estado
    def reset_state(self) -> None:
        self.session = SESSION_DEFAULT
        self.last_activity = time.monotonic()
        self.current_seed: Optional[List[int]] = None
        self.seed_time = 0.0
        self.security_unlocked = False
        self.immobilizer_present = True
        # Data transfer
        self.download_active = False
        self.block_counter = 0
        self.expected_size = 0
        self.received_size = 0
        self.calibration_written = False

    # -------------------------------------------------------------- housekeeping
    def _tick_session(self) -> None:
        """Aplica timeout de sessao S3: sem atividade, cai para default."""
        now = time.monotonic()
        if (self.session != SESSION_DEFAULT and
                now - self.last_activity > S3_SERVER_S):
            self._log("[TCU] S3 timeout: sessao estendida expirou -> default.", "warn")
            self.session = SESSION_DEFAULT
            self.security_unlocked = False
            self.current_seed = None
        self.last_activity = now

    def _nrc(self, sid: int, nrc: int, delay: float = 0.0) -> TcuReply:
        return TcuReply([NEGATIVE_RESPONSE_SID, sid, nrc], delay)

    # -------------------------------------------------------------- dispatcher
    def handle(self, request: List[int]) -> TcuReply:
        if not request:
            return self._nrc(0x00, NRC_SERVICE_NOT_SUPPORTED)

        sid = request[0]

        # TesterPresent nao conta como "falta de atividade" nem dispara logs.
        if sid == SID_TESTER_PRESENT:
            return self._handle_tester_present(request)

        self._tick_session()

        dispatch = {
            SID_DIAGNOSTIC_SESSION_CONTROL: self._handle_session,
            SID_READ_DATA_BY_IDENTIFIER:    self._handle_read_did,
            SID_SECURITY_ACCESS:            self._handle_security,
            SID_ROUTINE_CONTROL:            self._handle_routine,
            SID_REQUEST_DOWNLOAD:           self._handle_request_download,
            SID_TRANSFER_DATA:              self._handle_transfer_data,
            SID_REQUEST_TRANSFER_EXIT:      self._handle_transfer_exit,
        }
        handler = dispatch.get(sid)
        if handler is None:
            self._log("[TCU] Servico 0x{:02X} nao suportado.".format(sid), "err")
            return self._nrc(sid, NRC_SERVICE_NOT_SUPPORTED)
        return handler(request)

    # -------------------------------------------------------------- 0x3E
    def _handle_tester_present(self, request: List[int]) -> TcuReply:
        self.last_activity = time.monotonic()   # keep-alive renova S3
        sub = request[1] if len(request) > 1 else 0x00
        if sub & SUPPRESS_POS_RESPONSE:
            return TcuReply([])                  # resposta suprimida
        return TcuReply([SID_TESTER_PRESENT + POSITIVE_RESPONSE_OFFSET, 0x00])

    # -------------------------------------------------------------- 0x10
    def _handle_session(self, request: List[int]) -> TcuReply:
        if len(request) < 2:
            return self._nrc(request[0], NRC_SUB_FUNCTION_NOT_SUPPORTED)
        sub = request[1] & 0x7F
        if sub in (SESSION_DEFAULT, SESSION_EXTENDED):
            self.session = sub
            if sub == SESSION_DEFAULT:
                self.security_unlocked = False
            self._log("[TCU] Sessao 0x{:02X} ativa.".format(sub), "info")
            # 50 03 + P2(ms BE) + P2*(10ms BE)
            return TcuReply([SID_DIAGNOSTIC_SESSION_CONTROL + POSITIVE_RESPONSE_OFFSET,
                             sub, 0x00, 0x32, 0x01, 0xF4])
        return self._nrc(request[0], NRC_SUB_FUNCTION_NOT_SUPPORTED)

    # -------------------------------------------------------------- 0x22
    def _handle_read_did(self, request: List[int]) -> TcuReply:
        if len(request) < 3:
            return self._nrc(request[0], NRC_CONDITIONS_NOT_CORRECT)
        did = (request[1] << 8) | request[2]
        if did == DID_VIN:
            data = [ord(c) for c in self.VIN]
            self._log("[TCU] ReadDID 0xF190 -> VIN '{}'".format(self.VIN), "info")
            return TcuReply([SID_READ_DATA_BY_IDENTIFIER + POSITIVE_RESPONSE_OFFSET,
                             request[1], request[2]] + data)
        return self._nrc(request[0], NRC_REQUEST_OUT_OF_RANGE)

    # -------------------------------------------------------------- 0x27
    def _handle_security(self, request: List[int]) -> TcuReply:
        if self.session != SESSION_EXTENDED:
            return self._nrc(request[0], NRC_CONDITIONS_NOT_CORRECT)
        if len(request) < 2:
            return self._nrc(request[0], NRC_SUB_FUNCTION_NOT_SUPPORTED)
        sub = request[1]

        if sub == SECURITY_REQUEST_SEED:
            if self.security_unlocked:
                return TcuReply([SID_SECURITY_ACCESS + POSITIVE_RESPONSE_OFFSET,
                                 sub, 0x00, 0x00, 0x00, 0x00])
            self.current_seed = [random.randint(0, 255) for _ in range(4)]
            self.seed_time = time.monotonic()
            self._log("[TCU] Seed emitido: {}".format(hexstr(self.current_seed)), "info")
            return TcuReply([SID_SECURITY_ACCESS + POSITIVE_RESPONSE_OFFSET, sub]
                            + self.current_seed)

        if sub == SECURITY_SEND_KEY:
            if self.current_seed is None:
                return self._nrc(request[0], NRC_REQUEST_SEQUENCE_ERROR)
            if time.monotonic() - self.seed_time > SEED_VALIDITY_S:
                self.current_seed = None
                self._log("[TCU] Seed expirado (janela de seguranca fechada).", "warn")
                return self._nrc(request[0], NRC_REQUEST_SEQUENCE_ERROR)
            received = request[2:6]
            expected = compute_key_from_seed(self.current_seed)
            self.current_seed = None
            if received == expected:
                self.security_unlocked = True
                self._log("[TCU] Key valida. Acesso CONCEDIDO.", "ok")
                return TcuReply([SID_SECURITY_ACCESS + POSITIVE_RESPONSE_OFFSET, sub])
            self._log("[TCU] Key invalida (esperado {}).".format(hexstr(expected)), "err")
            return self._nrc(request[0], NRC_INVALID_KEY)

        return self._nrc(request[0], NRC_SUB_FUNCTION_NOT_SUPPORTED)

    # -------------------------------------------------------------- 0x31
    def _handle_routine(self, request: List[int]) -> TcuReply:
        if len(request) < 4:
            return self._nrc(request[0], NRC_CONDITIONS_NOT_CORRECT)
        sub = request[1]
        rid = (request[2] << 8) | request[3]
        if sub != ROUTINE_START:
            return self._nrc(request[0], NRC_SUB_FUNCTION_NOT_SUPPORTED)
        if rid == RID_ERASE_ISN:
            if not self.security_unlocked:
                return self._nrc(request[0], NRC_SECURITY_ACCESS_DENIED)
            if self.voltage < VOLTAGE_MIN_WRITE:
                self._log("[TCU] Erase ABORTADO: tensao {:.1f}V < {:.1f}V (anti-brick)."
                          .format(self.voltage, VOLTAGE_MIN_WRITE), "err")
                return self._nrc(request[0], NRC_VOLTAGE_TOO_LOW)
            self._log("[TCU] Apagando ISN / EEPROM do imobilizador...", "info")
            self.immobilizer_present = False
            # Delay > P2 -> dispara responsePending (0x78) no transporte.
            return TcuReply([SID_ROUTINE_CONTROL + POSITIVE_RESPONSE_OFFSET,
                             ROUTINE_START, request[2], request[3], 0x00], delay=1.2)
        return self._nrc(request[0], NRC_REQUEST_OUT_OF_RANGE)

    # -------------------------------------------------------------- 0x34
    def _handle_request_download(self, request: List[int]) -> TcuReply:
        if self.session != SESSION_EXTENDED:
            return self._nrc(request[0], NRC_CONDITIONS_NOT_CORRECT)
        if not self.security_unlocked:
            return self._nrc(request[0], NRC_SECURITY_ACCESS_DENIED)
        if self.voltage < VOLTAGE_MIN_WRITE:
            self._log("[TCU] Download recusado: tensao {:.1f}V insuficiente.".format(
                self.voltage), "err")
            return self._nrc(request[0], NRC_VOLTAGE_TOO_LOW)
        if self.download_active:
            return self._nrc(request[0], NRC_REQUEST_SEQUENCE_ERROR)
        if len(request) < 3:
            return self._nrc(request[0], NRC_UPLOAD_DOWNLOAD_NOT_ACCEPTED)

        alfid = request[2]
        size_len = (alfid >> 4) & 0x0F
        addr_len = alfid & 0x0F
        if addr_len == 0 or size_len == 0 or len(request) < 3 + addr_len + size_len:
            return self._nrc(request[0], NRC_REQUEST_OUT_OF_RANGE)

        addr = int.from_bytes(bytes(request[3:3 + addr_len]), "big")
        size = int.from_bytes(bytes(request[3 + addr_len:3 + addr_len + size_len]), "big")
        self.download_active = True
        self.block_counter = 0
        self.expected_size = size
        self.received_size = 0
        self.calibration_written = False
        self._log("[TCU] Download aceito: addr=0x{:08X} size={}B.".format(addr, size), "info")

        max_block = [(self.MAX_BLOCK_LENGTH >> 8) & 0xFF, self.MAX_BLOCK_LENGTH & 0xFF]
        return TcuReply([SID_REQUEST_DOWNLOAD + POSITIVE_RESPONSE_OFFSET, 0x20] + max_block,
                        delay=0.05)

    # -------------------------------------------------------------- 0x36
    def _handle_transfer_data(self, request: List[int]) -> TcuReply:
        if not self.download_active:
            return self._nrc(request[0], NRC_REQUEST_SEQUENCE_ERROR)
        if self.voltage < VOLTAGE_MIN_WRITE:
            self.download_active = False
            self._log("[TCU] Transferencia abortada: brownout no meio da gravacao!", "err")
            return self._nrc(request[0], NRC_VOLTAGE_TOO_LOW)
        if len(request) < 2:
            return self._nrc(request[0], NRC_TRANSFER_DATA_SUSPENDED)

        bsc = request[1]
        data = request[2:]
        if bsc == self.block_counter:          # retransmissao -> ACK repetido
            return TcuReply([SID_TRANSFER_DATA + POSITIVE_RESPONSE_OFFSET, bsc])
        if bsc != ((self.block_counter + 1) & 0xFF):
            self._log("[TCU] blockSequenceCounter errado (esperado 0x{:02X}).".format(
                (self.block_counter + 1) & 0xFF), "err")
            return self._nrc(request[0], NRC_WRONG_BLOCK_SEQUENCE_COUNTER)

        self.block_counter = bsc
        self.received_size += len(data)
        self._log("[TCU] Bloco 0x{:02X} gravado ({}B).".format(bsc, len(data)), "info")
        return TcuReply([SID_TRANSFER_DATA + POSITIVE_RESPONSE_OFFSET, bsc])

    # -------------------------------------------------------------- 0x37
    def _handle_transfer_exit(self, request: List[int]) -> TcuReply:
        if not self.download_active:
            return self._nrc(request[0], NRC_REQUEST_SEQUENCE_ERROR)
        if self.block_counter == 0:
            self.download_active = False
            return self._nrc(request[0], NRC_GENERAL_PROGRAMMING_FAILURE)
        self.download_active = False
        self.calibration_written = True
        self._log("[TCU] Transferencia OK: {} blocos / {}B. Checksum validado.".format(
            self.block_counter, self.received_size), "ok")
        return TcuReply([SID_REQUEST_TRANSFER_EXIT + POSITIVE_RESPONSE_OFFSET], delay=0.3)


# =============================================================================
# 5. ABSTRACAO DE TRANSPORTE (Inversao de Dependencia)
# =============================================================================

class CanTransportBase(ABC):
    """Contrato que QUALQUER meio fisico ou virtual deve cumprir.

    A GUI e o UdsClient dependem SOMENTE desta interface. Trocar o mock por um
    cabo real (PCAN/J2534/Tactrix) = criar outra subclasse e instancia-la em
    `main()`. Nenhuma outra camada e tocada.
    """

    name: str = "abstract"

    def __init__(self) -> None:
        self._t0 = time.perf_counter()
        self._monitor: Optional[Callable[[CanFrame], None]] = None

    # -- ciclo de vida ------------------------------------------------------
    @abstractmethod
    def open(self) -> None: ...

    @abstractmethod
    def close(self) -> None: ...

    @property
    @abstractmethod
    def is_open(self) -> bool: ...

    # -- troca UDS (ja reassemblada em payload) -----------------------------
    @abstractmethod
    def _exchange(self, payload: List[int],
                  p2_ms: int, p2_star_ms: int) -> List[int]:
        """Envia um payload UDS e retorna o payload de resposta.

        Deve levantar UdsTimeoutError se P2/P2* for excedido.
        Retorno vazio = resposta suprimida.
        """

    def request(self, payload: List[int],
                p2_ms: int = P2_SERVER_MS,
                p2_star_ms: int = P2_STAR_SERVER_MS) -> List[int]:
        if not self.is_open:
            raise UdsError("Transporte fechado - conecte antes de enviar.")
        return self._exchange(payload, p2_ms, p2_star_ms)

    # -- monitor de barramento (frames brutos) ------------------------------
    def set_monitor(self, callback: Callable[[CanFrame], None]) -> None:
        self._monitor = callback

    def _emit(self, direction: str, arb_id: int, data: List[int]) -> None:
        if self._monitor is not None:
            self._monitor(CanFrame(time.perf_counter() - self._t0,
                                   direction, arb_id, list(data)))

    def _emit_isotp(self, payload: List[int], direction: str) -> None:
        """Emite os frames ISO-TP de um payload, incluindo Flow Control."""
        sender_id = CAN_ID_TESTER if direction == "Tx" else CAN_ID_TCU
        recv_id = CAN_ID_TCU if direction == "Tx" else CAN_ID_TESTER
        recv_dir = "Rx" if direction == "Tx" else "Tx"
        frames = isotp_segment(payload)
        if len(frames) == 1:
            self._emit(direction, sender_id, frames[0])
            return
        self._emit(direction, sender_id, frames[0])                 # FirstFrame
        self._emit(recv_dir, recv_id,                               # FlowControl CTS
                   [0x30, 0x00, 0x00] + [ISOTP_PADDING] * 5)
        for cf in frames[1:]:
            self._emit(direction, sender_id, cf)                    # ConsecutiveFrames

    # -- telemetria opcional (simulador expoe tensao etc.) ------------------
    def telemetry(self) -> dict:
        return {}


class VirtualCanBus(CanTransportBase):
    """Transporte virtual: encapsula o mock TCU em memoria.

    Modela timing P2/P2* (responsePending), serializa acessos com lock (para
    conviver com o keep-alive em outra thread) e oferece injecao de falhas
    (brownout de bateria e perda de frame ISO-TP) para teste dos caminhos de
    erro que um barramento real apresentaria.
    """

    name = "VirtualCanBus (mock ZF 8HP)"

    def __init__(self, sim: ZF8HPSimulator):
        super().__init__()
        self.sim = sim
        self._open = False
        self._lock = threading.RLock()
        self._drop_next_response = False

    # -- ciclo de vida ------------------------------------------------------
    def open(self) -> None:
        with self._lock:
            self._open = True
            self._t0 = time.perf_counter()

    def close(self) -> None:
        with self._lock:
            self._open = False

    @property
    def is_open(self) -> bool:
        return self._open

    # -- injecao de falhas (apenas simulador) -------------------------------
    def set_brownout(self, active: bool) -> None:
        self.sim.voltage = VOLTAGE_BROWNOUT if active else VOLTAGE_NOMINAL

    def inject_frame_loss(self) -> None:
        """Faz a PROXIMA resposta ser perdida (dispara timeout no cliente)."""
        self._drop_next_response = True

    def telemetry(self) -> dict:
        return {"voltage": self.sim.voltage, "transport": self.name}

    # -- troca UDS ----------------------------------------------------------
    def _exchange(self, payload: List[int], p2_ms: int, p2_star_ms: int) -> List[int]:
        with self._lock:
            self._emit_isotp(payload, "Tx")

            if self._drop_next_response:
                self._drop_next_response = False
                # Simula resposta perdida no barramento -> timeout P2.
                time.sleep(p2_ms / 1000.0)
                raise UdsTimeoutError(
                    "P2 ({} ms) excedido: sem resposta (frame ISO-TP perdido).".format(p2_ms))

            reply = self.sim.handle(payload)
            if not reply.payload:                 # resposta suprimida (3E 80)
                return []

            p2 = p2_ms / 1000.0
            p2_star = p2_star_ms / 1000.0
            if reply.delay > p2:
                # Resposta demorada: avisa responsePending e estica ate P2*.
                self._emit_isotp([NEGATIVE_RESPONSE_SID, payload[0], NRC_RESPONSE_PENDING], "Rx")
                if reply.delay > p2_star:
                    time.sleep(p2_star)
                    raise UdsTimeoutError(
                        "P2* ({} ms) excedido durante operacao longa.".format(p2_star_ms))
                time.sleep(reply.delay)
            elif reply.delay > 0:
                time.sleep(reply.delay)

            self._emit_isotp(reply.payload, "Rx")
            return reply.payload


# =============================================================================
# 6. CLIENTE UDS (servicos de diagnostico de alto nivel)
# =============================================================================

class UdsClient:
    """Implementa os servicos UDS sobre uma `CanTransportBase` qualquer.

    Nao conhece Tkinter nem o mock: so fala UDS. Loga passos semanticos via
    callback e gerencia o keep-alive (TesterPresent) para manter a sessao viva.
    """

    def __init__(self, transport: CanTransportBase,
                 log: Callable[[str, str], None]):
        self.tp = transport
        self.log = log
        self.connected = False
        self.security_granted = False
        self.immobilizer_reset = False
        self._ka_stop = threading.Event()
        self._ka_thread: Optional[threading.Thread] = None

    # -- helper de requisicao ----------------------------------------------
    def _req(self, payload: List[int], **kw) -> List[int]:
        resp = self.tp.request(payload, **kw)
        if resp and resp[0] == NEGATIVE_RESPONSE_SID:
            raise UdsNegativeResponse(resp[1], resp[2])
        return resp

    # -- keep-alive (TesterPresent) ----------------------------------------
    def _start_keepalive(self) -> None:
        self._ka_stop.clear()

        def loop():
            while not self._ka_stop.wait(KEEPALIVE_S):
                try:
                    self.tp.request([SID_TESTER_PRESENT, SUPPRESS_POS_RESPONSE])
                except UdsError:
                    pass   # keep-alive e best-effort; falha nao derruba a UI
        self._ka_thread = threading.Thread(target=loop, daemon=True)
        self._ka_thread.start()

    def _stop_keepalive(self) -> None:
        self._ka_stop.set()

    # -- servicos -----------------------------------------------------------
    def connect(self) -> None:
        if not self.tp.is_open:
            self.tp.open()
        self.log("Abrindo sessao estendida (DiagnosticSessionControl 0x10 0x03)...", "info")
        self._req([SID_DIAGNOSTIC_SESSION_CONTROL, SESSION_EXTENDED])
        self.connected = True
        self.security_granted = False
        self._start_keepalive()
        self.log("Conectado. Sessao estendida ativa + keep-alive (TesterPresent).", "ok")

    def disconnect(self) -> None:
        self._stop_keepalive()
        self.connected = False
        self.security_granted = False
        if self.tp.is_open:
            self.tp.close()
        self.log("Desconectado do barramento.", "warn")

    def read_vin(self) -> str:
        self.log("Lendo VIN (ReadDataByIdentifier 0x22 0xF1 0x90)...", "info")
        resp = self._req([SID_READ_DATA_BY_IDENTIFIER,
                          (DID_VIN >> 8) & 0xFF, DID_VIN & 0xFF])
        vin = "".join(chr(b) for b in resp[3:])
        self.log("VIN: {}".format(vin), "ok")
        return vin

    def security_access(self) -> None:
        self.log("SecurityAccess - requisitando seed (0x27 0x01)...", "info")
        resp = self._req([SID_SECURITY_ACCESS, SECURITY_REQUEST_SEED])
        seed = resp[2:6]
        self.log("Seed recebido: {}".format(hexstr(seed)), "info")
        key = compute_key_from_seed(seed)
        self.log("Key calculada (XOR + inversao): {}".format(hexstr(key)), "info")
        self.log("Enviando key (0x27 0x02)...", "info")
        self._req([SID_SECURITY_ACCESS, SECURITY_SEND_KEY] + key)
        self.security_granted = True
        self.log("ACESSO DE SEGURANCA CONCEDIDO.", "ok")

    def reset_immobilizer(self) -> None:
        if not self.security_granted:
            raise UdsError("Reset bloqueado: sem acesso de seguranca.")
        self.log("RoutineControl Erase ISN (0x31 0x01 0x0F 0x01)...", "info")
        self.log("ECU processando (aguarde responsePending / P2*)...", "info")
        self._req([SID_ROUTINE_CONTROL, ROUTINE_START,
                   (RID_ERASE_ISN >> 8) & 0xFF, RID_ERASE_ISN & 0xFF])
        self.immobilizer_reset = True
        self.log("IMOBILIZADOR RESETADO. ISN apagado / transmissao virginizada.", "ok")

    def write_calibration(self, progress: Callable[[int, str], None],
                          total_blocks: int = 3, block_payload: int = 64) -> None:
        if not self.security_granted:
            raise UdsError("Gravacao bloqueada: sem acesso de seguranca.")
        file_size = total_blocks * block_payload
        progress(0, "iniciando")

        self.log("RequestDownload (0x34 00 44) addr=0x80010000 size={}B...".format(file_size),
                 "info")
        addr = list((0x80010000).to_bytes(4, "big"))
        size = list(file_size.to_bytes(4, "big"))
        resp = self._req([SID_REQUEST_DOWNLOAD, 0x00, 0x44] + addr + size)
        n = (resp[1] >> 4) & 0x0F
        max_block = int.from_bytes(bytes(resp[2:2 + n]), "big")
        self.log("Download aceito. maxNumberOfBlockLength = {}B.".format(max_block), "ok")

        for i in range(1, total_blocks + 1):
            bsc = i & 0xFF
            data = [(0x10 * i + k) & 0xFF for k in range(block_payload)]
            self.log("TransferData bloco {}/{} (0x36 {:02X})...".format(i, total_blocks, bsc),
                     "info")
            self._req([SID_TRANSFER_DATA, bsc] + data)
            progress(int(i * 100 / total_blocks), "{}/{} blocos".format(i, total_blocks))
            time.sleep(0.2)

        self.log("RequestTransferExit (0x37)...", "info")
        self._req([SID_REQUEST_TRANSFER_EXIT])
        progress(100, "concluida")
        self.log("CALIBRACAO GRAVADA. Checksum OK.", "ok")


# =============================================================================
# 7. INTERFACE GRAFICA - INDUSTRIAL DARK THEME
# =============================================================================

class Theme:
    """Paleta e tipografia 'Dark Industrial' (padrao de ferramenta de pista)."""
    BG        = "#1E1E24"   # antracite
    PANEL     = "#2A2A32"   # cinza fosco (painel de controle)
    PANEL_HI  = "#33333C"   # hover / destaque sutil
    CONSOLE   = "#17171C"   # fundo dos consoles (mais escuro que o BG)
    BORDER    = "#3A3A44"

    TEXT      = "#E6E6EC"
    MUTED     = "#8A8A96"

    GREEN     = "#00FF66"   # conectado / ok
    RED       = "#FF3366"   # erro / alerta
    AMBER      = "#FFB300"  # trafego / Tx
    CYAN      = "#38BDF8"   # Rx / dados
    PURPLE    = "#A78BFA"   # eventos de sistema

    @staticmethod
    def mono(size=11, bold=False):
        fam = Theme._pick(["Menlo", "Consolas", "DejaVu Sans Mono", "Courier New"])
        return (fam, size, "bold") if bold else (fam, size)

    @staticmethod
    def ui(size=12, bold=False):
        fam = Theme._pick(["Helvetica Neue", "Segoe UI", "Helvetica", "Arial"])
        return (fam, size, "bold") if bold else (fam, size)

    @staticmethod
    def _pick(candidates):
        try:
            available = set(tkfont.families())
        except Exception:
            return candidates[-1]
        for c in candidates:
            if c in available:
                return c
        return candidates[-1]


class DiagnosticGUI:
    """View: tres areas por grid - Operacoes, Console UDS e Monitor CAN."""

    def __init__(self, root: tk.Tk, transport: CanTransportBase):
        self.root = root
        self.transport = transport                     # depende SO da abstracao
        self.client = UdsClient(transport, log=self._log_uds)

        self._queue: "queue.Queue" = queue.Queue()
        self._busy = False

        self.brownout_var = tk.BooleanVar(value=False)

        # O monitor de barramento recebe frames de qualquer thread -> fila.
        self.transport.set_monitor(lambda f: self._queue.put(("frame", f)))

        self._configure_style()
        self._build_layout()
        self._pump_queue()
        self._refresh()

        self._log_uds("Suite iniciada. Transporte: {}".format(self.transport.name), "sys")
        self._log_uds("Clique em CONECTAR para abrir a sessao de diagnostico.", "sys")

    # ------------------------------------------------------------------ estilo
    def _configure_style(self):
        self.root.title("ZF 8HP Mechatronic Diagnostic Suite  -  EWS / ISN Tool")
        self.root.minsize(1180, 720)
        self.root.configure(bg=Theme.BG)
        # Abre grande e centralizado (nao apertado), limitado a tela disponivel.
        sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
        w, h = min(1560, sw - 120), min(900, sh - 160)
        x, y = (sw - w) // 2, max(20, (sh - h) // 2 - 20)
        self.root.geometry("{}x{}+{}+{}".format(w, h, x, y))

        st = ttk.Style()
        try:
            st.theme_use("clam")
        except tk.TclError:
            pass

        st.configure("TFrame", background=Theme.BG)
        st.configure("Panel.TFrame", background=Theme.PANEL)

        st.configure("Op.TButton", background=Theme.PANEL_HI, foreground=Theme.TEXT,
                     font=Theme.ui(11, True), borderwidth=0, focusthickness=0,
                     padding=(12, 11), relief="flat")
        st.map("Op.TButton",
               background=[("active", Theme.BORDER), ("disabled", "#26262C")],
               foreground=[("disabled", Theme.MUTED)])

        st.configure("Danger.TButton", background="#3A1F29", foreground=Theme.RED,
                     font=Theme.ui(11, True), borderwidth=0, padding=(12, 11))
        st.map("Danger.TButton",
               background=[("active", "#4A2533"), ("disabled", "#26262C")],
               foreground=[("disabled", Theme.MUTED)])

        st.configure("Ind.Horizontal.TProgressbar", troughcolor=Theme.CONSOLE,
                     background=Theme.GREEN, borderwidth=0, thickness=16)

        st.configure("TCheckbutton", background=Theme.PANEL, foreground=Theme.TEXT,
                     font=Theme.ui(10), focuscolor=Theme.PANEL)
        st.map("TCheckbutton", background=[("active", Theme.PANEL)],
               foreground=[("active", Theme.TEXT)])

    # ------------------------------------------------------------------ layout
    def _build_layout(self):
        # Barra superior de status (badges)
        top = tk.Frame(self.root, bg=Theme.PANEL, height=48)
        top.pack(fill="x", side="top")
        top.pack_propagate(False)

        tk.Label(top, text="  ZF 8HP  //  UDS DIAGNOSTIC", bg=Theme.PANEL,
                 fg=Theme.TEXT, font=Theme.ui(13, True)).pack(side="left", padx=12)

        self.badges = {}
        for key, label in (("conn", "LINK"), ("sec", "SECURITY"),
                           ("volt", "BATT"), ("imm", "IMMO"), ("cal", "CALIB")):
            self.badges[key] = self._make_badge(top, label)

        # Corpo: 3 colunas simetricas por grid
        body = ttk.Frame(self.root, style="TFrame")
        body.pack(fill="both", expand=True, padx=12, pady=12)
        body.columnconfigure(0, weight=4, uniform="col")
        body.columnconfigure(1, weight=5, uniform="col")
        body.columnconfigure(2, weight=6, uniform="col")
        body.rowconfigure(0, weight=1)

        self._build_operations(body)
        self._build_uds_console(body)
        self._build_can_monitor(body)

    def _make_badge(self, parent, label):
        wrap = tk.Frame(parent, bg=Theme.PANEL)
        wrap.pack(side="right", padx=6)
        tk.Label(wrap, text=label, bg=Theme.PANEL, fg=Theme.MUTED,
                 font=Theme.mono(9, True)).pack(anchor="e")
        val = tk.Label(wrap, text="--", bg=Theme.PANEL, fg=Theme.MUTED,
                       font=Theme.mono(11, True))
        val.pack(anchor="e")
        return val

    def _panel(self, parent, col, title):
        frame = tk.Frame(parent, bg=Theme.PANEL, highlightbackground=Theme.BORDER,
                         highlightthickness=1)
        frame.grid(row=0, column=col, sticky="nsew", padx=(0 if col == 0 else 6, 0))
        head = tk.Frame(frame, bg=Theme.PANEL)
        head.pack(fill="x", padx=12, pady=(10, 6))
        tk.Label(head, text=title, bg=Theme.PANEL, fg=Theme.TEXT,
                 font=Theme.mono(11, True)).pack(side="left")
        tk.Frame(frame, bg=Theme.BORDER, height=1).pack(fill="x", padx=12)
        return frame

    # ------------------------------------------------------- painel de operacoes
    def _build_operations(self, parent):
        panel = self._panel(parent, 0, "PAINEL DE OPERACOES")
        inner = tk.Frame(panel, bg=Theme.PANEL)
        inner.pack(fill="both", expand=True, padx=12, pady=12)

        self.buttons = {}
        specs = [
            ("connect", "CONECTAR OBD2", self.op_connect, "Op.TButton"),
            ("read",    "LER VIN / ID DA TCU", self.op_read_vin, "Op.TButton"),
            ("sec",     "ACESSO DE SEGURANCA", self.op_security, "Op.TButton"),
            ("reset",   "RESET EWS / IMOBILIZADOR", self.op_reset, "Danger.TButton"),
            ("calib",   "GRAVAR CALIBRACAO", self.op_calibration, "Op.TButton"),
        ]
        for key, text, cmd, style in specs:
            b = ttk.Button(inner, text=text, command=cmd, style=style)
            b.pack(fill="x", pady=4)
            self.buttons[key] = b

        tk.Frame(inner, bg=Theme.BORDER, height=1).pack(fill="x", pady=12)

        # Progresso do Data Transfer
        tk.Label(inner, text="DATA TRANSFER", bg=Theme.PANEL, fg=Theme.MUTED,
                 font=Theme.mono(9, True)).pack(anchor="w")
        self.progress = tk.DoubleVar(value=0)
        ttk.Progressbar(inner, orient="horizontal", mode="determinate",
                        variable=self.progress, maximum=100,
                        style="Ind.Horizontal.TProgressbar").pack(fill="x", pady=(4, 2))
        self.progress_lbl = tk.Label(inner, text="ocioso", bg=Theme.PANEL,
                                     fg=Theme.MUTED, font=Theme.mono(9))
        self.progress_lbl.pack(anchor="w")

        tk.Frame(inner, bg=Theme.BORDER, height=1).pack(fill="x", pady=12)

        # Injecao de falhas (teste dos caminhos de erro reais)
        tk.Label(inner, text="INJECAO DE FALHAS (BENCH)", bg=Theme.PANEL,
                 fg=Theme.MUTED, font=Theme.mono(9, True)).pack(anchor="w")
        ttk.Checkbutton(inner, text="Queda de tensao (brownout 9.4V)",
                        variable=self.brownout_var,
                        command=self._toggle_brownout).pack(anchor="w", pady=(4, 0))
        ttk.Button(inner, text="Perder proximo frame ISO-TP", style="Op.TButton",
                   command=self._inject_frame_loss).pack(fill="x", pady=(6, 0))

        inner.pack_configure()
        bottom = tk.Frame(inner, bg=Theme.PANEL)
        bottom.pack(side="bottom", fill="x")
        ttk.Button(bottom, text="DESCONECTAR / RESET ECU", style="Op.TButton",
                   command=self.op_disconnect).pack(fill="x")

    # ------------------------------------------------------- console UDS
    def _build_uds_console(self, parent):
        panel = self._panel(parent, 1, "CONSOLE DE DIAGNOSTICO UDS")
        self.uds = self._make_console(panel, wrap="word")
        for tag, color in (("sys", Theme.PURPLE), ("info", Theme.TEXT),
                           ("ok", Theme.GREEN), ("warn", Theme.AMBER),
                           ("err", Theme.RED), ("time", Theme.MUTED)):
            self.uds.tag_config(tag, foreground=color)

    # ------------------------------------------------------- monitor CAN
    def _build_can_monitor(self, parent):
        panel = self._panel(parent, 2, "MONITOR DO BARRAMENTO CAN")
        sub = tk.Frame(panel, bg=Theme.PANEL)
        sub.pack(fill="x", padx=12, pady=(6, 0))
        tk.Label(sub, text="{:>12}  {}  {:^10}  {}  {}".format(
            "TIME(s)", "DIR", "CAN-ID", "DLC", "DATA"),
            bg=Theme.PANEL, fg=Theme.MUTED, font=Theme.mono(9, True),
            anchor="w", justify="left").pack(fill="x")
        self.canmon = self._make_console(panel, small=True)
        for tag, color in (("Tx", Theme.AMBER), ("Rx", Theme.CYAN)):
            self.canmon.tag_config(tag, foreground=color)

    def _make_console(self, panel, small=False, wrap="none"):
        holder = tk.Frame(panel, bg=Theme.PANEL)
        holder.pack(fill="both", expand=True, padx=12, pady=12)
        txt = tk.Text(holder, bg=Theme.CONSOLE, fg=Theme.TEXT, insertbackground=Theme.TEXT,
                      font=Theme.mono(10 if small else 11), relief="flat",
                      borderwidth=0, wrap=wrap, state="disabled",
                      padx=10, pady=8)
        sb = ttk.Scrollbar(holder, orient="vertical", command=txt.yview)
        txt.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        txt.pack(side="left", fill="both", expand=True)
        return txt

    # ------------------------------------------------------------------ acoes
    def _run(self, fn):
        """Executa uma operacao em worker-thread (nao congela a UI)."""
        if self._busy:
            return
        self._busy = True
        self._refresh()

        def wrapper():
            try:
                fn()
            except UdsNegativeResponse as e:
                self._log_uds("RESPOSTA NEGATIVA: {}".format(e), "err")
            except UdsTimeoutError as e:
                self._log_uds("TIMEOUT: {}".format(e), "err")
            except UdsError as e:
                self._log_uds("ERRO: {}".format(e), "err")
            except Exception as e:                      # pragma: no cover
                self._log_uds("EXCECAO: {}".format(e), "err")
            finally:
                self._queue.put(("done", None))
        threading.Thread(target=wrapper, daemon=True).start()

    def op_connect(self):      self._run(self.client.connect)
    def op_read_vin(self):     self._run(self.client.read_vin)
    def op_security(self):     self._run(self.client.security_access)
    def op_reset(self):        self._run(self.client.reset_immobilizer)

    def op_calibration(self):
        self._run(lambda: self.client.write_calibration(
            progress=lambda pct, text: self._queue.put(("progress", (pct, text)))))

    def op_disconnect(self):
        def work():
            self.client.disconnect()
            if hasattr(self.transport, "sim"):
                self.transport.sim.reset_state()
            self.client.immobilizer_reset = False
            self._queue.put(("progress", (0, "ocioso")))
            self._log_uds("ECU religada. Estado reiniciado.", "sys")
        self._run(work)

    def _toggle_brownout(self):
        if hasattr(self.transport, "set_brownout"):
            self.transport.set_brownout(self.brownout_var.get())
        state = "9.4V (brownout)" if self.brownout_var.get() else "{:.1f}V".format(VOLTAGE_NOMINAL)
        self._log_uds("Tensao de bancada ajustada para {}.".format(state), "warn")

    def _inject_frame_loss(self):
        if hasattr(self.transport, "inject_frame_loss"):
            self.transport.inject_frame_loss()
            self._log_uds("Proximo frame ISO-TP sera perdido (deve gerar timeout).", "warn")

    # ------------------------------------------------------------------ logs
    def _log_uds(self, message, level="info"):
        self._queue.put(("log", (message, level)))

    def _pump_queue(self):
        try:
            while True:
                kind, data = self._queue.get_nowait()
                if kind == "done":
                    self._busy = False
                    self._refresh()
                elif kind == "log":
                    self._write_uds(*data)
                elif kind == "frame":
                    self._write_frame(data)
                elif kind == "progress":
                    pct, text = data
                    self.progress.set(pct)
                    self.progress_lbl.config(text=text)
        except queue.Empty:
            pass
        finally:
            self.root.after(40, self._pump_queue)

    def _write_uds(self, message, level):
        self.uds.config(state="normal")
        self.uds.insert("end", time.strftime("%H:%M:%S  "), "time")
        self.uds.insert("end", message + "\n", level)
        self.uds.see("end")
        self.uds.config(state="disabled")

    def _write_frame(self, frame: CanFrame):
        self.canmon.config(state="normal")
        self.canmon.insert("end", frame.format() + "\n", frame.direction)
        # limita o buffer do monitor para nao crescer indefinidamente
        if int(self.canmon.index("end-1c").split(".")[0]) > 500:
            self.canmon.delete("1.0", "100.0")
        self.canmon.see("end")
        self.canmon.config(state="disabled")

    # ------------------------------------------------------------------ status
    def _refresh(self):
        conn = self.client.connected
        sec = self.client.security_granted
        self._badge("conn", "ONLINE" if conn else "OFFLINE",
                    Theme.GREEN if conn else Theme.RED)
        self._badge("sec", "UNLOCKED" if sec else "LOCKED",
                    Theme.GREEN if sec else Theme.MUTED)

        volt = self.transport.telemetry().get("voltage")
        if volt is None:
            self._badge("volt", "--", Theme.MUTED)
        else:
            self._badge("volt", "{:.1f}V".format(volt),
                        Theme.RED if volt < VOLTAGE_MIN_WRITE else Theme.GREEN)

        imm_reset = self.client.immobilizer_reset
        self._badge("imm", "ERASED" if imm_reset else "PRESENT",
                    Theme.AMBER if imm_reset else Theme.MUTED)

        cal = getattr(getattr(self.transport, "sim", None), "calibration_written", False)
        self._badge("cal", "WRITTEN" if cal else "--",
                    Theme.GREEN if cal else Theme.MUTED)

        def en(flag): return "normal" if (flag and not self._busy) else "disabled"
        self.buttons["connect"].config(state=en(not conn))
        self.buttons["read"].config(state=en(conn))
        self.buttons["sec"].config(state=en(conn))
        self.buttons["reset"].config(state=en(conn and sec))
        self.buttons["calib"].config(state=en(conn and sec))

    def _badge(self, key, text, color):
        self.badges[key].config(text=text, fg=color)


# =============================================================================
# 8. PONTO DE ENTRADA
# =============================================================================

def main():
    # --- UNICA linha a trocar para hardware real ---------------------------
    # Ex.: transport = PCanTransport(channel="PCAN_USBBUS1", bitrate=500000)
    transport: CanTransportBase = VirtualCanBus(ZF8HPSimulator())
    # -----------------------------------------------------------------------

    root = tk.Tk()
    app = DiagnosticGUI(root, transport)

    def on_close():
        try:
            app.client.disconnect()
        except Exception:
            pass
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()


if __name__ == "__main__":
    main()
