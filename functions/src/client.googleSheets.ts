import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
  GoogleSpreadsheetRow,
} from "google-spreadsheet";
import * as D from "io-ts/lib/Decoder";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as ROA from "fp-ts/lib/ReadonlyArray";

import { SERVICE_ACCOUNT_CREDS, SPREADSHEET_ID } from "./config";

type SheetName = "staged_plan" | "stages" | "income" | "overview";

export function makeNewSpreadsheetInstance() {
  return new GoogleSpreadsheet(SPREADSHEET_ID);
}

function createServiceAccountAuth(spreadsheet: GoogleSpreadsheet) {
  return TE.tryCatch(
    () =>
      spreadsheet
        .useServiceAccountAuth(SERVICE_ACCOUNT_CREDS)
        .then(() => spreadsheet),
    (e) => `Could not connect to spreadsheets. ${e}`
  );
}

function loadSpreadsheetInfo(spreadsheet: GoogleSpreadsheet) {
  return TE.tryCatch(
    () => spreadsheet.loadInfo().then(() => spreadsheet),
    (e) => `Could not load spreadsheet info. ${e}`
  );
}

export function getSheetByName(name: SheetName) {
  return function getSheetFromDocByName(doc: GoogleSpreadsheet) {
    return pipe(
      doc,
      createServiceAccountAuth,
      TE.chain(loadSpreadsheetInfo),
      TE.map((s) => s.sheetsByTitle[name])
    );
  };
}

export function loadWorksheetRows(ws: GoogleSpreadsheetWorksheet) {
  return TE.tryCatch(
    () => ws.getRows().then((rs) => rs),
    (e) => `Could not load rows for worksheet: ${e}`
  );
}

export function getRawRowsData(rs: Array<GoogleSpreadsheetRow>) {
  return pipe(
    rs,
    ROA.map((r) => r._rawData)
  );
}

export function getRowsData<I, A>(decoder: D.Decoder<I, A>) {
  return function decodeRawRowsData(rs: Array<GoogleSpreadsheetRow>) {
    return pipe(
      rs,
      ROA.map((r) => r._rawData.map((c: string) => c.trim())),
      ROA.partitionMap(decoder.decode)
    );
  };
}

export function loadCellsInRange(row: string, column: string) {
  return function loadCellsForWorksheet(
    worksheet: GoogleSpreadsheetWorksheet
  ): TE.TaskEither<string, GoogleSpreadsheetWorksheet> {
    return TE.tryCatch(
      () => worksheet.loadCells(`${row}:${column}`).then(() => worksheet),
      () => `Could not load cells for range ${row}:${column}`
    );
  };
}

export const getFormattedCellValue = (row: string, column: string) => (
  worksheet: GoogleSpreadsheetWorksheet
): string => worksheet.getCellByA1(`${row}${column}`).formattedValue;
