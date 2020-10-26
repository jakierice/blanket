import { pipe } from "fp-ts/lib/function";
import * as D from "io-ts/lib/Decoder";
import * as ROA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";

import {
  makeNewSpreadsheetInstance,
  loadWorksheetRows,
  getRawRowsData,
  getSheetByName,
  getRowsData,
} from "./client.googleSheets";

const accountNameD = D.union(
  D.literal("Working Capital"),
  D.literal("CC Payoff Loan"),
  D.literal("Home Improvements"),
  D.literal("Travel"),
  D.literal("Emergency Fund"),
  D.literal("Rental Property"),
  D.literal("Forever Home"),
  D.literal("Peter's College"),
  D.literal("General Investing"),
  D.literal("Roth IRA")
);
// type AccountName = D.TypeOf<typeof accountNameD>;

const goalAmountD = D.string;
// type GoalAmount = D.TypeOf<typeof goalAmountD>;

const completionAmountD = D.string;
// type CompletionAmount = D.TypeOf<typeof completionAmountD>;

const completionDateD = D.string;
// type CompletionDate = D.TypeOf<typeof completionDateD>;

const accountD = D.tuple(
  accountNameD,
  goalAmountD,
  completionAmountD,
  completionDateD
);
// type Account = D.TypeOf<typeof accountD>

export const handleAccountNamesRequest = pipe(
  makeNewSpreadsheetInstance(),
  getSheetByName("overview"),
  TE.chain(loadWorksheetRows),
  TE.map((rs) =>
    pipe(
      rs,
      getRowsData(accountD),
      (decoded) => decoded.right,
      ROA.map(([name]) => name)
    )
  )
);

export const handlePlanAccountsRequest = pipe(
  makeNewSpreadsheetInstance(),
  getSheetByName("overview"),
  TE.chain(loadWorksheetRows),
  TE.map(getRawRowsData)
);
