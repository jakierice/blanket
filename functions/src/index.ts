import * as functions from "firebase-functions";
import cors from "cors";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import * as ROA from "fp-ts/lib/ReadonlyArray";

import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
  GoogleSpreadsheetRow,
} from "google-spreadsheet";

import { getConfig } from "./config";
import { pipe } from "fp-ts/lib/function";

const corsRequest = cors({ origin: true });

const {
  sheet,
  blanket_service_account: { private_key, client_email },
} = getConfig();

const creds = {
  client_email: client_email,
  private_key: private_key,
};

function handleCorsRequest(te: TE.TaskEither<unknown, unknown>) {
  return function (req: functions.https.Request, res: functions.Response) {
    const task = pipe(
      te,
      TE.fold(
        (e) => T.fromIO(() => res.status(500).send(e)),
        (d) => T.fromIO(() => res.send(d))
      )
    );
    corsRequest(req, res, task);
  };
}

const makeNewSpreadsheetInstance = () =>
  new GoogleSpreadsheet(sheet.spreadsheet_id);

const getFormattedCellValue = (row: string, column: string) => (
  worksheet: GoogleSpreadsheetWorksheet
): string => worksheet.getCellByA1(`${row}${column}`).formattedValue;

function loadCellsInRange(row: string, column: string) {
  return function loadCellsForWorksheet(
    worksheet: GoogleSpreadsheetWorksheet
  ): TE.TaskEither<string, GoogleSpreadsheetWorksheet> {
    return TE.tryCatch(
      () => worksheet.loadCells(`${row}:${column}`).then(() => worksheet),
      () => `Could not load cells for range ${row}:${column}`
    );
  };
}

function createServiceAccountAuth(spreadsheet: GoogleSpreadsheet) {
  return TE.tryCatch(
    () => spreadsheet.useServiceAccountAuth(creds).then(() => spreadsheet),
    (e) => `Could not connect to spreadsheets. Error: ${e}`
  );
}

function loadSpreadsheetInfo(spreadsheet: GoogleSpreadsheet) {
  return TE.tryCatch(
    () => spreadsheet.loadInfo().then(() => spreadsheet),
    (e) => `Could not load spreadsheet info. Error: ${e}`
  );
}

function getAccountsSheet(doc: GoogleSpreadsheet) {
  return pipe(
    doc,
    createServiceAccountAuth,
    TE.chain(loadSpreadsheetInfo),
    TE.map((s) => s.sheetsById[sheet.sheet_id])
  );
}

function loadWorksheetRows(ws: GoogleSpreadsheetWorksheet) {
  return TE.tryCatch(
    () => ws.getRows().then((rs) => rs),
    (e) => `Could not load rows for worksheet: ${e}`
  );
}

function getRawRowsData(rs: Array<GoogleSpreadsheetRow>) {
  return pipe(
    rs,
    ROA.map((r) => r._rawData)
  );
}

const handleAllAccountsRequest = pipe(
  makeNewSpreadsheetInstance(),
  getAccountsSheet,
  TE.chain(loadWorksheetRows),
  TE.map(getRawRowsData)
);

export const getAllAccounts = functions.https.onRequest(
  handleCorsRequest(handleAllAccountsRequest)
);
/* NOTE: this was the original "imperitive" approach that was based on the
 * various tuturial and articles for using Google Cloud Functions and the
 * google-spreadsheet package */
// export const getAllAccounts = functions.https.onRequest(
//   async (_request, response) => {
//     try {
//       const doc = new GoogleSpreadsheet(sheet.spreadsheet_id);
//       await doc.useServiceAccountAuth(creds);
//       await doc.loadInfo();
//       const accountsData = await doc.sheetsById[sheet.sheet_id].getRows();
//       const parsedRows = accountsData.map((r) => {
//         return r._rawData;
//       });
//       response.send(parsedRows);
//     } catch (e) {
//       response.send(`There was an error: ${e}`);
//     }
//   }
// );

const handleWorkingFundRequest = pipe(
  makeNewSpreadsheetInstance(),
  getAccountsSheet,
  TE.chain(loadCellsInRange("A2", "C2")),
  TE.map((worksheetWithCells) => ({
    name: getFormattedCellValue("A", "2")(worksheetWithCells),
    amount: getFormattedCellValue("B", "2")(worksheetWithCells),
    goal: getFormattedCellValue("C", "2")(worksheetWithCells),
  }))
);

export const getWorkingFund = functions.https.onRequest(
  handleCorsRequest(handleWorkingFundRequest)
);

/* NOTE: this was the original "imperitive" approach that was based on the
 * various tuturial and articles for using Google Cloud Functions and the
 * google-spreadsheet package */
/* FIRST ITERATION: directly from tutorials. Very imperitive, not as safe. */
// export const getWorkingFund = functions.https.onRequest((request, response) => {
//   corsRequest(request, response, async () => {
//     try {
//       const doc = new GoogleSpreadsheet(sheet.spreadsheet_id);
//       await doc.useServiceAccountAuth(creds);
//       await doc.loadInfo();
//       const worksheet = doc.sheetsById[sheet.sheet_id];
//       await worksheet.loadCells("A2:C2");
//
//       const name = worksheet.getCellByA1("A2").formattedValue;
//       const amount = worksheet.getCellByA1("B2").formattedValue;
//       const description = worksheet.getCellByA1("C2").formattedValue;
//
//       const data = { name, amount, description };
//
//       response.send(data);
//     } catch (e) {
//       response.status(500).send(`There was an error: ${e}`);
//     }
//   });
// });

/* SECOND ITERATION: A little more declaritve with extra safety, but still has
 * very specific implementation for handling the actual response IO */
// export const getWorkingFund = functions.https.onRequest(
//   async (request, response) => {
//     corsRequest(request, response, () => {
//       try {
//         {
//           const doc = new GoogleSpreadsheet(sheet.spreadsheet_id);
//           const loadWorkingFundCells = pipe(
//             doc,
//             createServiceAccountAuth,
//             TE.chain(loadSpreadsheetInfo),
//             TE.map((s) => s.sheetsById[sheet.sheet_id]),
//             TE.chain(loadCellsInRange("A2", "C2")),
//             TE.fold(
//               (e) =>
//                 T.fromIO(() =>
//                   response.send({
//                     error: e,
//                     data: { name: "", amount: "", goal: "" },
//                   })
//                 ),
//               (worksheetWithCells) =>
//                 T.fromIO(() =>
//                   response.send({
//                     error: "",
//                     data: {
//                       name: getFormattedCellValue("A", "2")(worksheetWithCells),
//                       amount: getFormattedCellValue(
//                         "B",
//                         "2"
//                       )(worksheetWithCells),
//                       goal: getFormattedCellValue("C", "2")(worksheetWithCells),
//                     },
//                   })
//                 )
//             )
//           );
//           loadWorkingFundCells();
//         }
//       } catch (e) {
//         response.status(500).send(`There was an error: ${e}`);
//       }
//     });
//   }
// );
