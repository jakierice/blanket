import * as functions from "firebase-functions";
import cors from "cors";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";

import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";

import { getConfig } from "./config";
import { pipe } from "fp-ts/lib/function";

const corsRequest = cors({ origin: true });

const {
  sheet,
  blanket_service_account: { private_key, client_email },
} = getConfig();

// Config variables
const CLIENT_EMAIL = client_email;
const PRIVATE_KEY = private_key;
const creds = {
  client_email: CLIENT_EMAIL,
  private_key: PRIVATE_KEY,
};

export const getAllAccounts = functions.https.onRequest(
  async (_request, response) => {
    try {
      const doc = new GoogleSpreadsheet(sheet.spreadsheet_id);
      await doc.useServiceAccountAuth(creds);
      await doc.loadInfo();
      const accountsData = await doc.sheetsById[sheet.sheet_id].getRows();
      const parsedRows = accountsData.map((r) => {
        return r._rawData;
      });
      response.send(parsedRows);
    } catch (e) {
      response.send(`There was an error: ${e}`);
    }
  }
);

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

export const getWorkingFund = functions.https.onRequest(
  async (request, response) => {
    corsRequest(request, response, () => {
      try {
        {
          const doc = new GoogleSpreadsheet(sheet.spreadsheet_id);
          // await doc.useServiceAccountAuth(creds);
          // await doc.loadInfo();
          // const worksheet = doc.sheetsById[sheet.sheet_id];
          const loadWorkingFundCells = pipe(
            doc,
            createServiceAccountAuth,
            TE.chain(loadSpreadsheetInfo),
            TE.map((s) => s.sheetsById[sheet.sheet_id]),
            TE.chain(loadCellsInRange("A2", "C2")),
            TE.fold(
              (e) =>
                T.fromIO(() =>
                  response.send({
                    error: e,
                    data: { name: "", amount: "", goal: "" },
                  })
                ),
              (worksheetWithCells) =>
                T.fromIO(() =>
                  response.send({
                    error: "",
                    data: {
                      name: getFormattedCellValue("A", "2")(worksheetWithCells),
                      amount: getFormattedCellValue(
                        "B",
                        "2"
                      )(worksheetWithCells),
                      goal: getFormattedCellValue("C", "2")(worksheetWithCells),
                    },
                  })
                )
            )
          );
          loadWorkingFundCells();
        }
      } catch (e) {
        response.status(500).send(`There was an error: ${e}`);
      }
    });
  }
);
