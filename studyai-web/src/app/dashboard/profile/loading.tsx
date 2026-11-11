import { ProfileSkeleton } from "./skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
      <ProfileSkeleton />
    </main>
  );
}
