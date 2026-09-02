import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { insertSpans } from '../storage/clickhouse';
import { validateSpanBatch } from '../ingestion/validator';

const PROTO_PATH = path.join(__dirname, '../../proto/tracelens.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tracelensProto = grpc.loadPackageDefinition(packageDefinition).tracelens as any;

export function startGrpcServer(port: number): void {
  const server = new grpc.Server();

  server.addService(tracelensProto.TraceCollector.service, {
    IngestSpans: (call: any, callback: any) => {
      const validation = validateSpanBatch(call.request);
      if (validation.error) {
        callback({ code: grpc.status.INVALID_ARGUMENT, message: validation.error });
        return;
      }

      insertSpans([validation.value!])
        .then(count => {
          callback(null, { ingested: count, trace_id: validation.value!.trace_id });
        })
        .catch(err => {
          callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    },
  });

  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) {
      console.error('gRPC server failed to start:', err);
      return;
    }
    console.log(`gRPC server running on port ${port}`);
  });
}
