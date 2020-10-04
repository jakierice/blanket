import * as functions from "firebase-functions";
import env from "../env.json";

/** NOTE: this way of dynamically configuring the env vars is based on this
 * article: https://medium.com/firelayer/deploying-environment-variables-with-firebase-cloud-functions-680779413484*/

/** CONFIG INSTRUCTIONS: to reset the configuration for deployed firebase
 * functions, run:
 *
 * firebase functions:config:unset env && firebase functions:config:set env="$(cat env.json)"*/
export function getConfig() {
  if (process.env.NODE_ENV !== "production") {
    return env;
  } else {
    return functions.config().env;
  }
}
