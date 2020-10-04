import * as functions from "firebase-functions";
import cors from "cors";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";

const corsRequest = cors({ origin: true });

export function handleCorsRequest(handler: TE.TaskEither<unknown, unknown>) {
  return function runHandlerWithCors(
    req: functions.https.Request,
    res: functions.Response
  ): void {
    const handlerTask = pipe(
      handler,
      TE.fold(
        (e) => T.fromIO(() => res.status(500).send(e)),
        (d) => T.fromIO(() => res.send(d))
      )
    );
    corsRequest(req, res, handlerTask);
  };
}
