import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { WebSocketServer } from "ws";
import { VTubeStudioApiError, VTubeStudioClient } from "./client.js";

test("client correlates API responses and surfaces API errors", async () => {
  const server = new WebSocketServer({ port: 0 });
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;

  server.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const request = JSON.parse(raw.toString()) as { requestID: string; messageType: string };
      if (request.messageType === "APIStateRequest") {
        socket.send(JSON.stringify({
          requestID: request.requestID,
          messageType: "APIStateResponse",
          data: { active: true, currentSessionAuthenticated: false }
        }));
      } else {
        socket.send(JSON.stringify({
          requestID: request.requestID,
          messageType: "APIError",
          data: { errorID: 401, message: "not authenticated" }
        }));
      }
    });
  });

  const client = new VTubeStudioClient({ host: "127.0.0.1", port, requestTimeoutMs: 1000 });
  try {
    await client.connect();
    const state = await client.apiState() as { data: { active: boolean } };
    assert.equal(state.data.active, true);

    await assert.rejects(
      () => client.currentModel(),
      (error: unknown) => error instanceof VTubeStudioApiError && error.errorID === 401
    );
  } finally {
    await client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("parameter injection does not claim face tracking state unless explicitly requested", async () => {
  const server = new WebSocketServer({ port: 0 });
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const requests: Array<{ requestID: string; messageType: string; data?: Record<string, unknown> }> = [];

  server.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const request = JSON.parse(raw.toString()) as {
        requestID: string;
        messageType: string;
        data?: Record<string, unknown>;
      };
      requests.push(request);
      socket.send(JSON.stringify({
        requestID: request.requestID,
        messageType: "InjectParameterDataResponse",
        data: {}
      }));
    });
  });

  const client = new VTubeStudioClient({ host: "127.0.0.1", port, requestTimeoutMs: 1000 });
  try {
    await client.connect();
    await client.injectParameters([{ id: "FaceAngleX", value: 2 }]);
    await client.injectParameters([{ id: "FaceAngleX", value: 3 }], { faceFound: true });

    assert.equal("faceFound" in requests[0].data!, false);
    assert.equal(requests[1].data?.faceFound, true);
  } finally {
    await client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
