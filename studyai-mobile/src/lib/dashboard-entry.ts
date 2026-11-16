import { getDashboardData, getStudyDocuments, type DashboardData, type DocumentsResponse } from "@/lib/dashboard-api";
import { getCurrentUser, type CurrentUser } from "@/lib/mobile-auth";
import { subscribeToSession } from "@/lib/session-events";

type DashboardEntry = {
  user: CurrentUser | null;
  overview: DashboardData | null;
  documents: DocumentsResponse | null;
  userRequest: Promise<CurrentUser | null>;
  statsRequest: Promise<DashboardData>;
  docsRequest: Promise<DocumentsResponse>;
};

let pendingEntry: DashboardEntry | null = null;
subscribeToSession(() => { pendingEntry = null; });

// La pantalla reutiliza estas mismas solicitudes durante la entrada desde login.
export function prepareDashboardEntry() {
  const entry: DashboardEntry = {
    user: null,
    overview: null,
    documents: null,
    userRequest: getCurrentUser(),
    statsRequest: getDashboardData(),
    docsRequest: getStudyDocuments(3, 0),
  };
  pendingEntry = entry;
  void entry.userRequest.then((user) => { entry.user = user; }, () => {});
  void entry.statsRequest.then((data) => { entry.overview = data; }, () => {});
  void entry.docsRequest.then((data) => { entry.documents = data; }, () => {});
  return entry;
}

export function readDashboardEntry() {
  return pendingEntry;
}

export function releaseDashboardEntry(entry: DashboardEntry | null) {
  if (pendingEntry === entry) pendingEntry = null;
}

export async function waitForDashboardEntry(entry: DashboardEntry) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.allSettled([entry.userRequest, entry.statsRequest, entry.docsRequest]),
      new Promise<void>((resolve) => { timeout = setTimeout(resolve, 450); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
