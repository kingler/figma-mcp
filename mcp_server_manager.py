#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse
import json
import signal
import time
import psutil

MCP_DIR = "/Users/kinglerbercy/MCP"

def find_process_by_name(name):
    """Find all processes with a specific name"""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if name.lower() in ' '.join(proc.info['cmdline']).lower():
            processes.append(proc)
    return processes

def start_server(server_name):
    """Start a specific MCP server"""
    server_path = os.path.join(MCP_DIR, server_name)
    if not os.path.exists(server_path):
        print(f"Error: Server {server_name} not found")
        return False
    
    # Determine if Node.js or Python server
    is_node = os.path.exists(os.path.join(server_path, "package.json"))
    is_python = os.path.exists(os.path.join(server_path, "requirements.txt"))
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(MCP_DIR, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    # Log files
    stdout_log = os.path.join(logs_dir, f"{server_name}.out.log")
    stderr_log = os.path.join(logs_dir, f"{server_name}.err.log")
    
    try:
        with open(stdout_log, "w") as out_log, open(stderr_log, "w") as err_log:
            if is_node:
                # Try build/index.js first, then dist/index.js if build doesn't exist
                if os.path.exists(os.path.join(server_path, "build", "index.js")):
                    print(f"Starting Node.js server: {server_name} (build/index.js)")
                    process = subprocess.Popen(
                        ["node", "build/index.js"], 
                        cwd=server_path,
                        stdout=out_log,
                        stderr=err_log
                    )
                elif os.path.exists(os.path.join(server_path, "dist", "index.js")):
                    print(f"Starting Node.js server: {server_name} (dist/index.js)")
                    process = subprocess.Popen(
                        ["node", "dist/index.js"], 
                        cwd=server_path,
                        stdout=out_log,
                        stderr=err_log
                    )
                else:
                    # Try npm start as fallback
                    print(f"Starting Node.js server: {server_name} (npm start)")
                    process = subprocess.Popen(
                        ["npm", "start"], 
                        cwd=server_path,
                        stdout=out_log,
                        stderr=err_log
                    )
            elif is_python:
                # Try different common Python entry points
                python_entry_points = ["app.py", "main.py", "server.py"]
                entry_point = next((ep for ep in python_entry_points 
                                   if os.path.exists(os.path.join(server_path, ep))), None)
                
                if entry_point:
                    print(f"Starting Python server: {server_name} ({entry_point})")
                    process = subprocess.Popen(
                        ["python", entry_point], 
                        cwd=server_path,
                        stdout=out_log,
                        stderr=err_log
                    )
                else:
                    print(f"Error: No Python entry point found for {server_name}")
                    return False
            else:
                print(f"Unknown server type for {server_name}")
                return False
            
            # Save process info
            save_process_info(server_name, process.pid)
            
            # Wait a bit to make sure process starts successfully
            time.sleep(2)
            if process.poll() is not None:
                print(f"Error: Server {server_name} failed to start. Check logs: {stderr_log}")
                return False
                
            print(f"Server {server_name} started with PID {process.pid}")
            print(f"Logs: {stdout_log}, {stderr_log}")
            return True
    except Exception as e:
        print(f"Error starting server {server_name}: {e}")
        return False

def save_process_info(server_name, pid):
    """Save process information to a JSON file"""
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    
    if os.path.exists(processes_file):
        with open(processes_file, "r") as f:
            try:
                processes = json.load(f)
            except json.JSONDecodeError:
                processes = {}
    else:
        processes = {}
    
    processes[server_name] = {
        "pid": pid,
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(processes_file, "w") as f:
        json.dump(processes, f, indent=2)

def remove_process_info(server_name):
    """Remove process information from the JSON file"""
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    
    if os.path.exists(processes_file):
        with open(processes_file, "r") as f:
            try:
                processes = json.load(f)
                if server_name in processes:
                    del processes[server_name]
            except json.JSONDecodeError:
                processes = {}
    else:
        return
    
    with open(processes_file, "w") as f:
        json.dump(processes, f, indent=2)

def stop_server(server_name):
    """Stop a specific MCP server"""
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    
    if not os.path.exists(processes_file):
        print(f"Error: No record of running processes found")
        return False
    
    with open(processes_file, "r") as f:
        try:
            processes = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Process records file is corrupted")
            return False
    
    if server_name not in processes:
        print(f"Error: Server {server_name} does not appear to be running")
        return False
    
    pid = processes[server_name]["pid"]
    
    try:
        # Try to terminate the process gracefully
        os.kill(pid, signal.SIGTERM)
        print(f"Termination signal sent to server {server_name} (PID {pid})")
        
        # Wait for process to terminate
        for _ in range(5):
            try:
                os.kill(pid, 0)  # This will raise OSError if process is gone
                time.sleep(1)
            except OSError:
                print(f"Server {server_name} stopped")
                remove_process_info(server_name)
                return True
        
        # If process didn't terminate, try SIGKILL
        print(f"Server {server_name} did not terminate gracefully, sending SIGKILL")
        os.kill(pid, signal.SIGKILL)
        print(f"Server {server_name} forcefully stopped")
        remove_process_info(server_name)
        return True
        
    except ProcessLookupError:
        print(f"Process {pid} not found, removing from records")
        remove_process_info(server_name)
        return True
    except Exception as e:
        print(f"Error stopping server {server_name}: {e}")
        return False

def list_servers():
    """List all available MCP servers"""
    all_dirs = os.listdir(MCP_DIR)
    servers = [d for d in all_dirs if os.path.isdir(os.path.join(MCP_DIR, d)) 
              and ("server" in d.lower() or "mcp" in d.lower())]
    
    # Load running processes
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    running_servers = {}
    if os.path.exists(processes_file):
        with open(processes_file, "r") as f:
            try:
                running_servers = json.load(f)
            except json.JSONDecodeError:
                pass
    
    print(f"Found {len(servers)} MCP servers:")
    for server in sorted(servers):
        status = "running" if server in running_servers else "stopped"
        print(f"- {server} [{status}]")
        
        if server in running_servers:
            pid = running_servers[server]["pid"]
            started_at = running_servers[server]["started_at"]
            try:
                os.kill(pid, 0)  # Check if process is actually running
                print(f"  PID: {pid}, Started at: {started_at}")
            except OSError:
                print(f"  WARNING: Process with PID {pid} is not running, but is marked as running")

def list_running():
    """List all running MCP servers"""
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    
    if not os.path.exists(processes_file):
        print("No running servers found")
        return
    
    with open(processes_file, "r") as f:
        try:
            processes = json.load(f)
        except json.JSONDecodeError:
            print("Error reading process records file")
            return
    
    if not processes:
        print("No running servers found")
        return
    
    print(f"Running MCP servers ({len(processes)}):")
    for server, info in sorted(processes.items()):
        pid = info["pid"]
        started_at = info["started_at"]
        try:
            os.kill(pid, 0)  # Check if process is actually running
            print(f"- {server}")
            print(f"  PID: {pid}, Started at: {started_at}")
        except OSError:
            print(f"- {server} (STALE)")
            print(f"  PID: {pid}, Started at: {started_at}")
            print(f"  WARNING: Process is no longer running")

def stop_all():
    """Stop all running MCP servers"""
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    
    if not os.path.exists(processes_file):
        print("No running servers found")
        return
    
    with open(processes_file, "r") as f:
        try:
            processes = json.load(f)
        except json.JSONDecodeError:
            print("Error reading process records file")
            return
    
    if not processes:
        print("No running servers found")
        return
    
    print(f"Stopping all running MCP servers ({len(processes)})...")
    success_count = 0
    
    for server in list(processes.keys()):
        print(f"\nStopping {server}...")
        if stop_server(server):
            success_count += 1
    
    print(f"\nSuccessfully stopped {success_count} out of {len(processes)} servers")

def clean_stale():
    """Clean stale entries from the running_processes.json file"""
    processes_file = os.path.join(MCP_DIR, "running_processes.json")
    
    if not os.path.exists(processes_file):
        print("No running servers found")
        return
    
    with open(processes_file, "r") as f:
        try:
            processes = json.load(f)
        except json.JSONDecodeError:
            print("Error reading process records file")
            return
    
    if not processes:
        print("No processes to clean")
        return
    
    print(f"Checking {len(processes)} process records for stale entries...")
    stale = []
    
    for server, info in processes.items():
        pid = info["pid"]
        try:
            os.kill(pid, 0)  # Check if process is actually running
        except OSError:
            stale.append(server)
    
    if not stale:
        print("No stale process records found")
        return
    
    print(f"Found {len(stale)} stale entries to clean:")
    for server in stale:
        print(f"- {server} (PID: {processes[server]['pid']})")
        remove_process_info(server)
    
    print("Stale entries cleaned successfully")

def main():
    parser = argparse.ArgumentParser(description="MCP Server Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start an MCP server")
    start_parser.add_argument("server", help="Server name to start")
    
    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop an MCP server")
    stop_parser.add_argument("server", help="Server name to stop")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List all MCP servers")
    
    # List running command
    list_running_parser = subparsers.add_parser("running", help="List running MCP servers")
    
    # Stop all command
    stop_all_parser = subparsers.add_parser("stopall", help="Stop all running MCP servers")
    
    # Clean stale command
    clean_parser = subparsers.add_parser("clean", help="Clean stale process records")
    
    args = parser.parse_args()
    
    if args.command == "start":
        start_server(args.server)
    elif args.command == "stop":
        stop_server(args.server)
    elif args.command == "list":
        list_servers()
    elif args.command == "running":
        list_running()
    elif args.command == "stopall":
        stop_all()
    elif args.command == "clean":
        clean_stale()
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 