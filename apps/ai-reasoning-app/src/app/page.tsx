export default function Home() {
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Reasoning Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border p-4 rounded-md bg-purple-50">
            <h3 className="font-medium">Deductive Reasoning</h3>
            <p className="mt-2 text-sm text-gray-600">
              Draw logical conclusions using formal rules of inference
            </p>
          </div>
          
          <div className="border p-4 rounded-md bg-purple-50">
            <h3 className="font-medium">Inductive Reasoning</h3>
            <p className="mt-2 text-sm text-gray-600">
              Develop general theories from specific observations
            </p>
          </div>
          
          <div className="border p-4 rounded-md bg-purple-50">
            <h3 className="font-medium">Abductive Reasoning</h3>
            <p className="mt-2 text-sm text-gray-600">
              Find the simplest and most likely explanation
            </p>
          </div>
        </div>
      </section>
      
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Try Reasoning</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="premise" className="block text-sm font-medium text-gray-700 mb-1">
              Premises
            </label>
            <textarea
              id="premise"
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter your premises here, one per line..."
            />
          </div>
          
          <div>
            <label htmlFor="reasoning-type" className="block text-sm font-medium text-gray-700 mb-1">
              Reasoning Type
            </label>
            <select
              id="reasoning-type"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option>Deductive</option>
              <option>Inductive</option>
              <option>Abductive</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Generate Conclusions
          </button>
        </form>
      </section>
      
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Recent Reasoning Graphs</h2>
        <div className="space-y-4">
          <div className="border p-4 rounded-md hover:bg-gray-50 cursor-pointer">
            <h3 className="font-medium">Climate Change Analysis</h3>
            <p className="text-sm text-gray-500">Created 2 hours ago</p>
          </div>
          
          <div className="border p-4 rounded-md hover:bg-gray-50 cursor-pointer">
            <h3 className="font-medium">Economic Policy Evaluation</h3>
            <p className="text-sm text-gray-500">Created yesterday</p>
          </div>
          
          <div className="border p-4 rounded-md hover:bg-gray-50 cursor-pointer">
            <h3 className="font-medium">Healthcare System Analysis</h3>
            <p className="text-sm text-gray-500">Created 3 days ago</p>
          </div>
        </div>
      </section>
    </div>
  );
} 