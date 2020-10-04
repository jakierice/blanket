import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

import {
  makeNewSpreadsheetInstance,
  getAccountsSheet,
  loadWorksheetRows,
  getRawRowsData,
  loadCellsInRange,
  getFormattedCellValue,
} from "./client.googleSheets";

export const handleAllAccountsRequest = pipe(
  makeNewSpreadsheetInstance(),
  getAccountsSheet,
  TE.chain(loadWorksheetRows),
  TE.map(getRawRowsData)
);

export const handleWorkingFundRequest = pipe(
  makeNewSpreadsheetInstance(),
  getAccountsSheet,
  TE.chain(loadCellsInRange("A2", "C2")),
  TE.map((worksheetWithCells) => ({
    name: getFormattedCellValue("A", "2")(worksheetWithCells),
    amount: getFormattedCellValue("B", "2")(worksheetWithCells),
    goal: getFormattedCellValue("C", "2")(worksheetWithCells),
  }))
);
