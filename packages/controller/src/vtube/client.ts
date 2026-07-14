import WebSocket from "ws";

export interface VTubeStudioClientOptions {
  host: string;
  port: number;
  requestTimeoutMs?: number;
}

interface VTubeRequest {
  apiName: "VTubeStudioPublicAPI";
  apiVersion: "1.0";
  requestID: string;
  messageType: string;
  data?: unknown;
}

interface VTubeResponse {
  requestID?: string;
  messageType?: string;
  data?: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
  messageType: string;
}

export class VTubeStudioApiError extends Error {
  constructor(
    public readonly errorID: number | undefined,
    message: string,
    public readonly requestMessageType: string
  ) {
    super(message);
    this.name = "VTubeStudioApiError";
  }
}

/**
 * Thin protocol client. It deliberately does not yet implement token persistence,
 * reconnect policy, or a playback session. Those remain part of M1-004.
 */
export class VTubeStudioClient {
  private ws: WebSocket | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly requestTimeoutMs: number;

  constructor(private readonly options: VTubeStudioClientOptions) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5000;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const url = `ws://${this.options.host}:${this.options.port}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        cleanupInitialListeners();
        resolve();
      };
      const onError = (error: Error) => {
        cleanupInitialListeners();
        reject(new Error(`Could not connect to VTube Studio at ${url}: ${error.message}`));
      };
      const cleanupInitialListeners = () => {
        ws.off("open", onOpen);
        ws.off("error", onError);
      };

      ws.once("open", onOpen);
      ws.once("error", onError);
    });

    ws.on("message", (raw) => this.handleMessage(raw));
    ws.on("close", () => this.rejectAllPending(new Error("VTube Studio WebSocket closed")));
    ws.on("error", (error) => this.rejectAllPending(error));
  }

  async close(): Promise<void> {
    const ws = this.ws;
    this.ws = null;
    if (!ws || ws.readyState === WebSocket.CLOSED) return;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1000);
      ws.once("close", () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.close();
    });
  }

  async apiState(): Promise<unknown> {
    return this.send("APIStateRequest");
  }

  async requestAuthenticationToken(
    pluginName: string,
    pluginDeveloper: string,
    pluginIcon?: string
  ): Promise<unknown> {
    return this.send("AuthenticationTokenRequest", {
      pluginName,
      pluginDeveloper,
      ...(pluginIcon ? { pluginIcon } : {})
    });
  }

  async authenticate(
    pluginName: string,
    pluginDeveloper: string,
    authenticationToken: string
  ): Promise<unknown> {
    return this.send("AuthenticationRequest", {
      pluginName,
      pluginDeveloper,
      authenticationToken
    });
  }

  async currentModel(): Promise<unknown> {
    return this.send("CurrentModelRequest");
  }

  async inputParameters(): Promise<unknown> {
    return this.send("InputParameterListRequest");
  }

  async currentModelHotkeys(): Promise<unknown> {
    return this.send("HotkeysInCurrentModelRequest");
  }

  async triggerHotkey(hotkeyIDOrName: string): Promise<unknown> {
    return this.send("HotkeyTriggerRequest", { hotkeyID: hotkeyIDOrName });
  }

  async injectParameters(
    parameterValues: Array<{ id: string; value: number; weight?: number }>,
    options: { faceFound?: boolean; mode?: "set" | "add" } = {}
  ): Promise<unknown> {
    return this.send("InjectParameterDataRequest", {
      mode: options.mode ?? "set",
      parameterValues,
      ...(options.faceFound === undefined ? {} : { faceFound: options.faceFound })
    });
  }

  private async send(messageType: string, data?: unknown): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("VTube Studio WebSocket is not connected");
    }

    const requestID = makeRequestId(messageType);
    const request: VTubeRequest = {
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      requestID,
      messageType,
      ...(data === undefined ? {} : { data })
    };

    const response = new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestID);
        reject(new Error(`Timed out waiting for VTube Studio response to ${messageType}`));
      }, this.requestTimeoutMs);

      this.pending.set(requestID, { resolve, reject, timeout, messageType });
    });

    try {
      ws.send(JSON.stringify(request));
    } catch (error) {
      const pending = this.pending.get(requestID);
      if (pending) clearTimeout(pending.timeout);
      this.pending.delete(requestID);
      throw error;
    }

    return response;
  }

  private handleMessage(raw: WebSocket.RawData): void {
    let response: VTubeResponse;
    try {
      response = JSON.parse(raw.toString()) as VTubeResponse;
    } catch {
      return;
    }

    if (!response.requestID) return;
    const pending = this.pending.get(response.requestID);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pending.delete(response.requestID);

    if (response.messageType === "APIError") {
      const data = response.data as { errorID?: number; message?: string } | undefined;
      pending.reject(new VTubeStudioApiError(
        data?.errorID,
        data?.message ?? "VTube Studio returned an API error",
        pending.messageType
      ));
      return;
    }

    pending.resolve(response);
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function makeRequestId(messageType: string): string {
  const prefix = messageType.replace(/Request$/, "").slice(0, 24) || "request";
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
