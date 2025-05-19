export default function Home() {
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Server Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border p-4 rounded-md bg-green-50">
            <h3 className="font-medium">MCP Core</h3>
            <div className="mt-2 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span>Running</span>
            </div>
          </div>
          
          <div className="border p-4 rounded-md bg-green-50">
            <h3 className="font-medium">AI Reasoning</h3>
            <div className="mt-2 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span>Running</span>
            </div>
          </div>
          
          <div className="border p-4 rounded-md bg-yellow-50">
            <h3 className="font-medium">TaskMaster</h3>
            <div className="mt-2 flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              <span>Idle</span>
            </div>
          </div>
        </div>
      </section>
      
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Start All Services
          </button>
          <button className="p-3 bg-red-600 text-white rounded-md hover:bg-red-700">
            Stop All Services
          </button>
          <button className="p-3 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md hover:bg-indigo-200">
            View Logs
          </button>
          <button className="p-3 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md hover:bg-indigo-200">
            Server Settings
          </button>
        </div>
      </section>
      
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm text-gray-500">CPU Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">Memory Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">Disk Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '22%' }}></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 