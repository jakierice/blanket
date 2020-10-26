import * as functions from "firebase-functions";

import { handleCorsRequest } from "./rest.utilities";
import {
  handlePlanAccountsRequest,
  handleAccountNamesRequest,
} from "./handlers.accounts";

export const getPlanAccountNames = functions.https.onRequest(
  handleCorsRequest(handleAccountNamesRequest)
);

export const getPlanAccounts = functions.https.onRequest(
  handleCorsRequest(handlePlanAccountsRequest)
);
