import type { SunatSendResult, TaxEnvironment } from "./types.ts";

export interface SunatClient {
  send(fileName: string, signedXml: string, idempotencyKey: string): Promise<SunatSendResult>;
  query(ticket: string): Promise<SunatSendResult>;
}
export type SoapOperation = "sendBill" | "sendSummary" | "getStatus";
export type SoapTransport = (request: {
  endpoint: string;
  operation: SoapOperation;
  body: string;
  timeoutMs: number;
}) => Promise<{ status: number; body: string }>;

export type SoapSunatOptions = {
  endpoint: string;
  username: string;
  password: string;
  transport: SoapTransport;
  timeoutMs?: number;
};

const xmlEscape = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );

export class SoapSunatClient {
  private readonly timeoutMs: number;
  private readonly options: SoapSunatOptions;
  constructor(options: SoapSunatOptions) {
    if (!/^https:\/\//.test(options.endpoint)) throw new Error("El endpoint SOAP debe usar HTTPS");
    this.options = options;
    this.timeoutMs = Math.min(Math.max(options.timeoutMs ?? 15_000, 1_000), 30_000);
  }
  private envelope(content: string) {
    return `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${xmlEscape(this.options.username)}</wsse:Username><wsse:Password>${xmlEscape(this.options.password)}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body>${content}</soapenv:Body></soapenv:Envelope>`;
  }
  private async call(operation: SoapOperation, content: string) {
    try {
      const response = await this.options.transport({
        endpoint: this.options.endpoint,
        operation,
        body: this.envelope(content),
        timeoutMs: this.timeoutMs,
      });
      if (response.status >= 500)
        return {
          kind: "temporary" as const,
          code: `HTTP_${response.status}`,
          message: "Servicio SUNAT temporalmente no disponible",
        };
      if (/<(?:faultcode|faultstring)>/i.test(response.body))
        return {
          kind: "permanent" as const,
          code: "SOAP_FAULT",
          message: "SUNAT rechazó la solicitud SOAP",
        };
      return { kind: "ok" as const, code: "0", body: response.body };
    } catch (error) {
      const code =
        (error as NodeJS.ErrnoException).code === "ETIMEDOUT" ? "TIMEOUT" : "CONNECTION_ERROR";
      return {
        kind: "temporary" as const,
        code,
        message: code === "TIMEOUT" ? "Tiempo de espera agotado" : "No se pudo conectar con SUNAT",
      };
    }
  }
  sendBill(fileName: string, zipBase64: string) {
    return this.call(
      "sendBill",
      `<ser:sendBill><fileName>${xmlEscape(fileName)}</fileName><contentFile>${zipBase64}</contentFile></ser:sendBill>`,
    );
  }
  sendSummary(fileName: string, zipBase64: string) {
    return this.call(
      "sendSummary",
      `<ser:sendSummary><fileName>${xmlEscape(fileName)}</fileName><contentFile>${zipBase64}</contentFile></ser:sendSummary>`,
    );
  }
  getStatus(ticket: string) {
    return this.call(
      "getStatus",
      `<ser:getStatus><ticket>${xmlEscape(ticket)}</ticket></ser:getStatus>`,
    );
  }
}

export const SUNAT_BETA_ENDPOINT = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService";
export class MockSunatClient implements SunatClient {
  private readonly scenario: "accepted" | "observed" | "rejected" | "timeout";
  constructor(scenario: "accepted" | "observed" | "rejected" | "timeout" = "accepted") {
    this.scenario = scenario;
  }
  async send(fileName: string, _xml: string, key: string) {
    if (this.scenario === "timeout")
      return {
        status: "connection_error",
        code: "TIMEOUT",
        message: "Timeout simulado; consultar antes de reintentar",
        cdr: null,
      } as const;
    if (this.scenario === "rejected")
      return {
        status: "rejected",
        code: "2335",
        message: "Rechazo tributario simulado",
        cdr: `R-${fileName}`,
      } as const;
    if (this.scenario === "observed")
      return {
        status: "accepted_with_observations",
        code: "0",
        message: "Aceptado con observaciones (simulado)",
        cdr: `R-${fileName}:${key}`,
      } as const;
    return {
      status: "accepted",
      code: "0",
      message: "Aceptado por SUNAT simulada",
      cdr: `R-${fileName}:${key}`,
    } as const;
  }
  async query(ticket: string) {
    return {
      status: "accepted",
      code: "0",
      message: "Ticket aceptado (simulado)",
      cdr: `CDR:${ticket}`,
    } as const;
  }
}
export function createSunatClient(environment: TaxEnvironment) {
  if (environment !== "mock")
    throw new Error(
      `Cliente SUNAT ${environment} bloqueado hasta autorización y credenciales válidas`,
    );
  return new MockSunatClient();
}
