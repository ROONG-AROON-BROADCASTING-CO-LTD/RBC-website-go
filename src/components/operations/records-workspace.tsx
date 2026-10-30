"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useRBC } from "@/components/rbc/provider";
import {
  Panel,
  TextField,
  ChoiceField,
  Status,
  Blank,
} from "@/components/rbc/common";
import { records } from "./records";
import { RecordDetails } from "./record-details";

export function RecordsWorkspace({ tab }: { tab: string }) {
  const { state, setState, t, amount } = useRBC();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState("");
  const all = records(state, tab);
  const rows = all.filter(
    (row) =>
      (row.name + " " + row.id + " " + row.detail + " " + t(row.status))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All statuses" || row.status === status),
  );
  const current = all.find((r) => r.id === selected);
  return (
    <>
      <>
        <Panel>
          <FieldGroup className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <TextField
              label="Search records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ChoiceField
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                "All statuses",
                ...new Set(all.map((row) => row.status)),
              ]}
            />
          </FieldGroup>
          {rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Reference",
                    "Name",
                    "Status",
                    ...(tab === "payments" ||
                    tab === "fleet" ||
                    tab === "listings"
                      ? ["Amount"]
                      : []),
                    "Details",
                  ].map((col) => (
                    <TableHead key={col}>{t(col)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{row.id}</TableCell>
                    <TableCell>
                      <p className="font-medium">{row.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(row.detail)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Status value={row.status} />
                    </TableCell>
                    {["payments", "fleet", "listings"].includes(tab) && (
                      <TableCell>{amount(row.amount || 0)}</TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelected(row.id);
                        }}
                      >
                        {t("View Details")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Blank />
          )}
        </Panel>
        {tab === "payments" && (
          <div className="mt-6">
            <Panel title="Partner payouts">
              <div className="flex flex-wrap items-center gap-4">
                <Status value={state.payout} />
                <Button
                  variant="outline"
                  disabled={state.payout === "Paid"}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      payout: "Paid",
                      activity: ["Payout marked paid", ...s.activity],
                    }))
                  }
                >
                  {t("Mark payout paid")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("All amounts are illustrative.")}
                </p>
              </div>
            </Panel>
          </div>
        )}
      </>
      <RecordDetails
        key={tab + "/" + selected}
        tab={tab}
        selected={selected}
        current={current}
        onClose={() => setSelected("")}
      />
    </>
  );
}
