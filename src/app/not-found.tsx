export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-2xl font-semibold tracking-tight">404</div>
      <div className="mt-2 text-sm opacity-80">This page could not be found.</div>
      <a
        href="/en"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white"
      >
        Back to home
      </a>
    </div>
  );
}
