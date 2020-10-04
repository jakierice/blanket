import * as functions from "firebase-functions";

import { handleCorsRequest } from "./rest.utilities";
import {
  handleAllAccountsRequest,
  handleWorkingFundRequest,
} from "./handlers.accounts";

export const getAllAccounts = functions.https.onRequest(
  handleCorsRequest(handleAllAccountsRequest)
);

export const getWorkingFund = functions.https.onRequest(
  handleCorsRequest(handleWorkingFundRequest)
);
