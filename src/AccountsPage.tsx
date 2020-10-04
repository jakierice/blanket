import React from "react";
import axios from "axios";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import * as RD from "@devexperts/remote-data-ts";
import { pipe } from "fp-ts/lib/function";
import logo from "./logo.svg";
import {setTimeout} from "timers";

function fetchWorkingFund() {
  return TE.tryCatch(
    () =>
      axios
        .get(
          "http://localhost:5001/blanket-1601739611194/us-central1/getWorkingFund"
        )
        .then((res) => res.data),
    (e) => `Could not fetch working fund data. ${e}`
  );
}

export const AccountsPage = () => {
  const [accounts, setAccounts] = React.useState<
    RD.RemoteData<
      string,
      { data: { name: string; amount: string; goal: string } }
    >
  >(RD.initial);
  React.useEffect(() => {
    const loadWorkingFund = pipe(
      fetchWorkingFund(),
      TE.bimap(RD.failure, RD.success),
      TE.fold(
        (e) => T.fromIO(() => setAccounts(e)),
        (s) => T.fromIO(() => setAccounts(s))
      )
    );
    setAccounts(RD.pending);
    loadWorkingFund();
  }, []);
  return pipe(
    accounts,
    RD.fold(
      () => <></>,
      () => <img src={logo} className="App-logo" alt="logo" />,
      (e) => (
        <>
          <p>The was an error retrieving working fund.</p>
          <pre>{e}</pre>
        </>
      ),
      ({ data: account }) => (
        <>
          <h2>{account.name}</h2>
          <span>Current balance: {account.amount}</span>
          <span>Goal: {account.goal}</span>
        </>
      )
    )
  );
};
