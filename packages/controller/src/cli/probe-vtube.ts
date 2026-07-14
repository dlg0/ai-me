import { VTubeStudioClient } from "../vtube/client.js";
import { fail } from "./io.js";

const host = process.env.VTS_HOST ?? "localhost";
const port = Number(process.env.VTS_PORT ?? "8001");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fail(`Invalid VTS_PORT: ${process.env.VTS_PORT}`);
}

const client = new VTubeStudioClient({ host, port });
try {
  console.log(`Connecting to ws://${host}:${port} ...`);
  await client.connect();
  const response = await client.apiState();
  console.log(JSON.stringify(response, null, 2));
  console.log("Probe complete. This command does not authenticate or control the avatar.");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await client.close();
}
