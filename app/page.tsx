import NodeMap from "@/components/node-map"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-black text-white">
      <div className="w-full max-w-7xl">
        <NodeMap />
      </div>
    </main>
  )
}

