import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import Link from "next/link";
import { SignOutButton } from "~/components/sign-out-button";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  // This should never be null due to middleware, but TypeScript doesn't know that
  if (!session) {
    return null; // This will never render due to middleware redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">Hello World!</h1>

        <div className="space-y-4">
          <p className="text-lg text-gray-600">
            Welcome back, {session.user?.name || session.user?.email}!
          </p>
          <p className="text-gray-500">
            You are successfully logged in.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/chat/new"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Start New Chat
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
