import Link from "next/link";
import Image from "next/image";

export const metadata = { title: 'TTLike · TikTok Viral Intelligence Platform' };

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans text-zinc-950">
      {/* 导航栏 */}
      <header className="flex items-center justify-between px-8 py-6 max-w-6xl w-full mx-auto border-b border-zinc-200/50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-pink-600 font-mono">TTLIKE</span>
          <span className="text-xs bg-zinc-200/60 text-zinc-600 px-2 py-0.5 rounded-full font-mono font-medium">v1.0</span>
        </div>
        <Link 
          href="/auth/login" 
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* 主战场 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-3xl mx-auto text-center -mt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-pink-700 text-xs font-medium mb-6 animate-fade-in">
          <span>⚡ Next-gen TikTok UGC Engine Active</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.15] mb-6">
          Generate Viral TikTok UGC Scripts <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">
            Driven by Intelligent AI
          </span>
        </h1>
        
        <p className="text-md sm:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed mb-10">
          Unlock 5 tailored UGC video variations in seconds. Built for scale, backed by enterprise-grade prompt engines, optimized for high-converting asset creation.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link
            href="/auth/signup"
            className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 w-full sm:w-auto shadow-sm"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            className="flex h-12 items-center justify-center rounded-lg border border-zinc-200 bg-white px-8 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 w-full sm:w-auto"
          >
            Access Dashboard
          </Link>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="py-6 text-center text-xs text-zinc-400 font-mono border-t border-zinc-100">
        &copy; {new Date().getFullYear()} TTLIKE. Lab-Grade Content Intelligence.
      </footer>
    </div>
  );
}