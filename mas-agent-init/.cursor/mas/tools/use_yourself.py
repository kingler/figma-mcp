# Import necessary libraries for async operations, data handling, GUI automation, and system interaction
import asyncio
import base64
import os
from dataclasses import dataclass, fields, replace
from enum import StrEnum
from pathlib import Path
from typing import Any, Literal, Optional, TypedDict, List, Dict, cast
from datetime import datetime
import anthropic
from anthropic.types import MessageParam
import pyautogui
from io import BytesIO
import keyboard
from PIL import Image
import platform
from termcolor import cprint

COORDINATES = "x=736, y=673"

# Display warning message about script safety
print("""NOTE: Please be very careful running this script!! this runs locally on your machine(NO SANDBOX) There is an artificial delay in script before each action so you can review them(default 5 seconds). KEEP A WATCHFUL EYE ON IT! AND STOP THE SCRIPT DURING WAIT TIME IF IT TRIES TO DO SOMETHING YOU DONT WANT. BY RUNNING THIS SCRIPT YOU ASSUME THE RESPONSIBILITY OF THE OUTCOMES""")

# Global configuration for action confirmation delay
# Can be disabled by setting to None, or adjusted to different duration in seconds
WAIT_BEFORE_ACTION: Optional[float] = 5.0

# Configure PyAutoGUI safety features
pyautogui.FAILSAFE = True  # Enables fail-safe corner movement to stop execution
pyautogui.PAUSE = 0.1  # Sets minimum delay between actions

# Define core type literals for actions and commands
# Actions represent physical interactions with the computer
Action = Literal[
    "key",  # Keyboard key press
    "type",  # Text input
    "mouse_move",  # Move mouse cursor
    "left_click",  # Left mouse button click
    "left_click_drag",  # Click and drag with left button
    "right_click",  # Right mouse button click
    "middle_click",  # Middle mouse button click
    "double_click",  # Double click
    "screenshot",  # Take screenshot
    "cursor_position",  # Get cursor coordinates
]

# Commands represent file operations
Command = Literal[
    "view",  # View file contents
    "create",  # Create new file
    "str_replace",  # Replace text in file
    "insert",  # Insert text at line
    "undo_edit",  # Undo last edit
]

# Type definition for screen resolution
class Resolution(TypedDict):
    width: int
    height: int

# Standard resolution targets for scaling operations
MAX_SCALING_TARGETS: dict[str, Resolution] = {
    "XGA": Resolution(width=1024, height=768),  # Standard 4:3
    "WXGA": Resolution(width=1280, height=800),  # Widescreen 16:10
    "FWXGA": Resolution(width=1366, height=768),  # Widescreen ~16:9
}

@dataclass(frozen=True)
class ToolResult:
    """
    Represents the result of a tool operation
    
    This immutable dataclass encapsulates various types of output that can be produced:
    - text output (output)
    - error messages (error) 
    - image data (base64_image)
    - system messages (system)
    
    The class supports boolean evaluation and field replacement.
    """
    output: Optional[str] = None
    error: Optional[str] = None
    base64_image: Optional[str] = None
    system: Optional[str] = None

    def __bool__(self):
        """Returns True if any field has a non-None value"""
        return any(getattr(self, field.name) for field in fields(self))
    
    def replace(self, **kwargs):
        """Creates new instance with specified fields replaced"""
        return replace(self, **kwargs)

class ToolError(Exception):
    """Custom exception for tool-specific errors with message storage"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

class ComputerTool:
    """
    Provides interface for computer interaction through mouse and keyboard
    
    This class handles:
    - Screen resolution scaling between virtual and physical coordinates
    - Mouse movement and clicking
    - Keyboard input
    - Screenshot capture
    - Action verification and safety delays
    
    The tool operates in a virtual resolution space (default WXGA) and scales
    coordinates to match the actual screen resolution.
    """
    name = "computer"
    api_type = "computer_20241022"
    _screenshot_delay = 1.0
    
    def __init__(self):
        """Initialize with screen resolution detection and scaling setup"""
        self.screen_width, self.screen_height = pyautogui.size()
        print(f"Actual screen resolution: {self.screen_width}x{self.screen_height}")
        
        # Configure target resolution for coordinate scaling
        target_res = MAX_SCALING_TARGETS["WXGA"]
        self.width = target_res["width"]
        self.height = target_res["height"]
        print(f"Target resolution for scaling: {self.width}x{self.height}")
        
    def to_params(self):
        """Return tool parameters for API configuration"""
        return {
            "type": self.api_type,
            "name": self.name,
            "display_width_px": self.width,
            "display_height_px": self.height,
            "display_number": 1,
        }

    async def __call__(self, action: Action, text: Optional[str] = None,
                       coordinate: Optional[tuple[int, int] | List[int]] = None, **kwargs):
        """
        Execute computer interaction actions
        
        This method:
        1. Validates and processes input parameters
        2. Applies safety delays and confirmations
        3. Scales coordinates if needed
        4. Executes the requested action
        5. Captures verification screenshot
        6. Returns results or error information
        
        Actions are executed with safety checks and user confirmation delays.
        Screenshots are taken after most actions to verify results.
        """
        try:
            # Get action description for user feedback
            action_desc = self._get_action_description(action, text, coordinate)
            print(f"\nPending Action: {action_desc}")
            
            # Apply safety delay if configured
            if WAIT_BEFORE_ACTION is not None:
                print(f"Waiting {WAIT_BEFORE_ACTION} seconds before executing action. Press Ctrl+C to abort...")
                await asyncio.sleep(WAIT_BEFORE_ACTION)

            # Process coordinates
            if isinstance(coordinate, list) and len(coordinate) == 2:
                coordinate = tuple(coordinate)

            # Scale coordinates to physical screen space
            if coordinate:
                if not isinstance(coordinate, tuple) or len(coordinate) != 2:
                    raise ToolError(f"Invalid coordinate format: {coordinate}")
                try:
                    x, y = int(coordinate[0]), int(coordinate[1])
                    x, y = self._scale_coordinates(x, y)
                    coordinate = (x, y)
                except (ValueError, TypeError):
                    raise ToolError(f"Invalid coordinate values: {coordinate}")

            # Execute requested action based on type
            if action in ("mouse_move", "left_click_drag"):
                if not coordinate:
                    raise ToolError(f"coordinate required for {action}")
                x, y = coordinate
                print(f"Moving to scaled coordinates: ({x}, {y})")
                if action == "mouse_move":
                    pyautogui.moveTo(x, y)
                else:
                    pyautogui.dragTo(x, y, button='left')
                
            elif action in ("key", "type"):
                if not text:
                    raise ToolError(f"text required for {action}")
                print(f"Sending text: {text}")
                if action == "key":
                    keyboard.send(text)
                else:
                    pyautogui.write(text, interval=0.01)
                
            elif action in ("left_click", "right_click", "middle_click", "double_click"):
                print(f"Performing {action}")
                click_map = {
                    "left_click": lambda: pyautogui.click(button='left'),
                    "right_click": lambda: pyautogui.click(button='right'),
                    "middle_click": lambda: pyautogui.click(button='middle'),
                    "double_click": lambda: pyautogui.doubleClick()
                }
                click_map[action]()
                
            elif action == "cursor_position":
                x, y = pyautogui.position()
                scaled_x, scaled_y = self._inverse_scale_coordinates(x, y)
                return ToolResult(output=f"X={scaled_x},Y={scaled_y}")
            
            elif action == "screenshot":
                return await self._take_screenshot()

            # Capture verification screenshot after action
            if action != "cursor_position":
                await asyncio.sleep(self._screenshot_delay)
                result = await self._take_screenshot()
                if result.error:
                    raise ToolError(result.error)
                return result
            
        except Exception as e:
            error_msg = f"Action failed: {str(e)}"
            print(f"\nError: {error_msg}")
            return ToolResult(error=error_msg)

    def _scale_coordinates(self, x: int, y: int) -> tuple[int, int]:
        """Convert virtual coordinates to physical screen coordinates"""
        scaled_x = int(x * (self.screen_width / self.width))
        scaled_y = int(y * (self.screen_height / self.height))
        return scaled_x, scaled_y

    def _inverse_scale_coordinates(self, x: int, y: int) -> tuple[int, int]:
        """Convert physical screen coordinates to virtual coordinates"""
        scaled_x = int(x * (self.width / self.screen_width))
        scaled_y = int(y * (self.height / self.screen_height))
        return scaled_x, scaled_y

    async def _take_screenshot(self) -> ToolResult:
        """
        Capture and process screenshot
        
        Captures screen, resizes to virtual resolution,
        converts to base64 for transmission
        """
        try:
            screenshot = pyautogui.screenshot()
            if screenshot.size != (self.width, self.height):
                screenshot = screenshot.resize(
                    (self.width, self.height), 
                    Image.Resampling.LANCZOS
                )
            
            buffered = BytesIO()
            screenshot.save(buffered, format="PNG", optimize=True)
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return ToolResult(base64_image=img_str)
        except Exception as e:
            return ToolResult(error=f"Screenshot failed: {str(e)}")

    def _get_action_description(self, action: Action, text: Optional[str],
                              coordinate: Optional[tuple[int, int] | List[int]]) -> str:
        """Generate human-readable description of pending action"""
        if action in ("mouse_move", "left_click_drag"):
            return f"{action.replace('_', ' ').title()} to coordinates: {coordinate}"
        elif action in ("key", "type"):
            return f"{action.title()} text: '{text}'"
        elif action in ("left_click", "right_click", "middle_click", "double_click"):
            return f"Perform {action.replace('_', ' ')}"
        elif action == "screenshot":
            return "Take a screenshot"
        elif action == "cursor_position":
            return "Get current cursor position"
        return f"Unknown action: {action}"

class EditTool:
    """
    File editing tool for text manipulation
    
    Provides capabilities for:
    - Viewing file contents
    - Creating new files
    - String replacement
    - Line insertion
    - Edit history tracking
    
    All operations maintain file history for potential undo operations
    """
    name = "str_replace_editor"
    api_type = "text_editor_20241022"
    
    def __init__(self):
        """Initialize with empty file history"""
        self._file_history = {}

    def to_params(self):
        """Return tool parameters for API configuration"""
        return {
            "type": self.api_type,
            "name": self.name
        }

    async def __call__(self, command: Command, path: str, file_text: Optional[str] = None,
                       old_str: Optional[str] = None, new_str: Optional[str] = None,
                       insert_line: Optional[int] = None, view_range: Optional[List[int]] = None,
                       **kwargs):
        """
        Execute file editing operations
        
        Handles:
        - File viewing (with optional line range)
        - File creation
        - String replacement (with uniqueness validation)
        - Line insertion
        
        All operations include error checking and history tracking
        """
        try:
            path_obj = Path(path)
            
            # Validate absolute path
            if not path_obj.is_absolute():
                suggested_path = Path.cwd() / path
                raise ToolError(f"Path must be absolute. Did you mean: {suggested_path}?")

            # Handle different commands
            if command == "view":
                content = path_obj.read_text(encoding='utf-8')
                if view_range:
                    lines = content.splitlines()
                    start, end = view_range
                    content = '\n'.join(lines[start-1:end])
                return ToolResult(output=self._format_output(content, path))
            
            elif command == "create":
                if not file_text:
                    raise ToolError("file_text required for create")
                if path_obj.exists():
                    raise ToolError(f"File already exists: {path}")
                path_obj.write_text(file_text, encoding='utf-8')
                self._file_history[path] = [file_text]
                return ToolResult(output=f"File created at {path}")

            elif command == "str_replace":
                if not old_str:
                    raise ToolError("old_str required for str_replace")
                content = path_obj.read_text(encoding='utf-8')
                occurrences = content.count(old_str)
                if occurrences == 0:
                    raise ToolError(f"String '{old_str}' not found in file")
                if occurrences > 1:
                    raise ToolError(f"Multiple occurrences ({occurrences}) of '{old_str}' found")
                new_content = content.replace(old_str, new_str or "")
                self._file_history[path] = self._file_history.get(path, []) + [content]
                path_obj.write_text(new_content, encoding='utf-8')
                return ToolResult(output=self._format_output(new_content, path))

            elif command == "insert":
                if insert_line is None or not new_str:
                    raise ToolError("insert_line and new_str required for insert")
                content = path_obj.read_text(encoding='utf-8')
                lines = content.splitlines()
                if not (0 <= insert_line <= len(lines)):
                    raise ToolError(f"Invalid line number: {insert_line}")
                lines.insert(insert_line, new_str)
                new_content = '\n'.join(lines)
                self._file_history[path] = self._file_history.get(path, []) + [content]
                path_obj.write_text(new_content, encoding='utf-8')
                return ToolResult(output=self._format_output(new_content, path))

            raise ToolError(f"Invalid command: {command}")
            
        except Exception as e:
            if isinstance(e, ToolError):
                raise
            raise ToolError(f"File operation failed: {str(e)}")

    def _format_output(self, content: str, path: str) -> str:
        """Format file content with line numbers for display"""
        numbered_lines = [f"{i+1:6}\t{line}" for i, line in enumerate(content.splitlines())]
:start_line:385
-------
        return f"Content of {path}:\n" + '\n'.join(numbered_lines)

def process_self_prompt(raw_text: str) -> dict:
    """
    Processes text to extract a "Self-prompt: " line and remove it.

    Args:
        raw_text (str): The raw text output from the LLM.

    Returns:
        dict: A dictionary with 'processed_text' and 'suggested_next_prompt' fields.
    """
    lines = raw_text.split('\n')
    suggested_next_prompt = None
    processed_lines = []
    self_prompt_line_index = -1

    # Find the last "Self-prompt:" line (case-insensitive, with trimming)
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip().lower().startswith('self-prompt:'):
            self_prompt_line_index = i
            break

    if self_prompt_line_index != -1:
        self_prompt_line = lines[self_prompt_line_index]
        # Extract the text after "Self-prompt:"
        suggested_next_prompt = self_prompt_line[self_prompt_line.lower().find('self-prompt:') + len('Self-prompt:'):].strip()

        # Reconstruct the text without the "Self-prompt:" line
        processed_lines = [line for i, line in enumerate(lines) if i != self_prompt_line_index]
    else:
        # If no "Self-prompt:" line is found, use the original text
        processed_lines = lines

    processed_text = '\n'.join(processed_lines)

    return {
        "processed_text": processed_text,
        "suggested_next_prompt": suggested_next_prompt
    }


class ComputerControlAPI:
    """
    Main API class for computer control interface
    
    Manages:
    - Communication with Anthropic's Claude API
    - Tool coordination (ComputerTool and EditTool)
    - Conversation flow and message handling
    - Tool execution and result processing
    """
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        """Initialize API with authentication and tools"""
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.computer_tool = ComputerTool()
        self.edit_tool = EditTool()
        
    async def run_conversation(self):
        """
        Main conversation loop
        
        Handles:
        1. User input collection
        2. API communication
        3. Tool execution
        4. Result processing
        5. Conversation state management
        
        Includes error handling and graceful shutdown
        """
        messages = []
        system = self._get_system_prompt()
        print("\nComputer Control Assistant Initialized")
        print("Display configured for WXGA resolution (1280x800)")
        
        try:
            while True:
                # Get initial user input
                if not messages:
                    user_input = input("\nWhat would you like me to do? (type 'exit' to quit): ").strip()
                    if user_input.lower() == 'exit':
                        break
                    messages.append({
                        "role": "user",
                        "content": [{"type": "text", "text": user_input}]
                    })

                print("\nProcessing request...")
                # Get API response
                response = self.client.beta.messages.create(
                    model=self.model,
                    messages=cast(List[MessageParam], messages),
                    system=system,
                    tools=[self.computer_tool.to_params(), self.edit_tool.to_params()],
                    max_tokens=4096,
                    extra_headers={"anthropic-beta": "computer-use-2024-10-22"}
                )

                # Process assistant's response
                tool_calls = []
                suggested_next_prompt = None
                processed_content = []
                print("\nAssistant's Plan:")
                
                # Handle response content
                for block in response.content:
                    # Process text responses
                    if hasattr(block, 'text'):
                        filter_result = process_self_prompt(block.text)
                        processed_text = filter_result["processed_text"]
                        if filter_result["suggested_next_prompt"]:
                            suggested_next_prompt = filter_result["suggested_next_prompt"]
                        
                        # Print processed text
                        print(f"\n{processed_text}")
                        
                        # Add processed text to content for the message
                        processed_content.append({"type": "text", "text": processed_text})

                    # Collect tool calls
                    if hasattr(block, 'type') and block.type == 'tool_use':
                        tool_calls.append({
                            "name": block.name,
                            "input": block.input,
                            "id": block.id
                        })
                        print(f"\n[Planning: {block.name} - {block.input}]")
                        # Add tool calls to processed content
                        processed_content.append(block)


                message_to_append = {
                    "role": "assistant",
                    "content": processed_content
                }
                
                # Add suggested_next_prompt if found
                if suggested_next_prompt:
                    message_to_append["suggested_next_prompt"] = suggested_next_prompt

                messages.append(message_to_append)

                # Handle no-action case
                if not tool_calls:
                    user_continue = input("\nNo actions to perform. Continue? (yes/no): ").lower()
                    if user_continue != 'yes':
                        break
                    messages = []
                    continue

                # Execute tools and collect results
                tool_results = []
                for tool_call in tool_calls:
                    try:
                        tool_name = tool_call.get("name")
                        tool_input = tool_call.get("input", {})
                        
                        # Select appropriate tool
                        tool = self.computer_tool if tool_name == "computer" else self.edit_tool
                        
                        print(f"\nExecuting {tool_name} with input: {tool_input}")
                        
                        # Execute tool
                        result = await tool(**tool_input)
                        
                        # Format and collect results
                        formatted_result = {
                            "type": "tool_result",
                            "tool_use_id": tool_call.get("id"),
                            "is_error": bool(result.error),
                            "content": self._format_tool_result(result)
                        }
                        
                        tool_results.append(formatted_result)
                        
                        # Show results to user
                        if result.error:
                            print(f"\nError: {result.error}")
                        elif result.output:
                            print(f"\nResult: {result.output}")
                        
                        # Small delay between actions
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        print(f"\nError executing tool: {str(e)}")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_call.get("id"),
                            "is_error": True,
                            "content": [{"type": "text", "text": f"Tool execution failed: {str(e)}"}]
                        })

                if tool_results:
                    messages.append({
                        "role": "user",
                        "content": tool_results
                    })

        except KeyboardInterrupt:
            print("\nOperation cancelled by user")
        except Exception as e:
            print(f"\nAn error occurred: {str(e)}")
            if DEBUG:
                import traceback
                traceback.print_exc()
        finally:
            print("\nThank you for using Computer Control Assistant!")

    def _format_tool_result(self, result: ToolResult) -> List[Dict[str, Any]]:
        """Format tool results for API communication"""
        content = []
        
        if result.error:
            return [{"type": "text", "text": result.error}]
        
        if result.system:
            content.append({"type": "text", "text": f"<system>{result.system}</system>"})
            
        if result.output:
            content.append({"type": "text", "text": result.output})
            
        if result.base64_image:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": result.base64_image
                }
            })
            
        return content

    def _get_system_prompt(self) -> str:
        """Generate system prompt with current configuration and capabilities"""
        return f"""<SYSTEM_CAPABILITY>
        * YOU ARE USING A CODE EDITOR CALLED CURSOR VERY SIMILAR TO VS CODE. PLEASE INSTRUCT THE AGENT ON THE RIGHT PANEL. you must enter your instructions in the right bottom of the screen. you will be instructing an AI agent there to do what is being asked
        You are not allowed to do file operations. you are only allowed to use the cursor code editor in the window that you see. insert your instructions to the agent there at the bottom right where it says edit code
        this is the cordinates of the text input box you will be using "x=736, y=673" then you can use enter key
        you are only allowed to move to this particular coordinate to input your instructions.
        do not generate code or try to modify file system. simply go to the coordinate and insert insttuctions for cursor agent in plain english as instructed. 
        here are the steps you should take:
        1- go to the coordinate {COORDINATES}
        2- click into the text input box (you can only write a single line of insttuctions do not use new lines until you are done with your instructions. only at the very end you use new line(enter key) to submit your instructions)
        3- type in your instructions
        4- press enter to submit your instructions
* You are utilizing a Windows {platform.machine()} machine.
* You can control the computer through mouse movements, clicks, and keyboard input.
* The display is configured for WXGA resolution (1280x800) for consistency.
* All coordinates you receive and send should be in WXGA resolution - they will be automatically scaled.
* After each action you'll receive a screenshot to confirm the result.
* Each action requires user confirmation via Enter key before execution.
* You can use both keyboard.send() for special keys and type() for text input.
</SYSTEM_CAPABILITY>

<IMPORTANT>
* ALWAYS TAKE A SCREENSHOT AFTER EACH ACTION TO CONFIRM THE RESULT.
* Always take small, deliberate steps and verify the results through screenshots.
* When using Firefox, if a startup wizard appears, ignore it and click directly on the address bar.
* For text-heavy pages, consider downloading the content and using the text editor tool.
* Before each action, clearly explain what you're about to do and why.
* If an action fails, try alternative approaches or ask for user guidance.
* Keep track of window focus and mouse position for accurate interactions.
* Use 'key' action for special keys like 'ctrl', 'alt', 'tab', 'enter', etc.
* Use 'type' action for regular text input.
</IMPORTANT>

<SPECIAL_KEYS>
* Navigation: 'left', 'right', 'up', 'down', 'home', 'end', 'pageup', 'pagedown'
* Editing: 'backspace', 'delete', 'tab', 'enter'
* Modifiers: 'ctrl', 'alt', 'shift'
* Function: 'f1' through 'f12'
* Combinations: Use '+' to combine keys, e.g., 'ctrl+c', 'alt+tab'
</SPECIAL_KEYS>

The current date is {datetime.now().strftime('%A, %B %d, %Y')}.
"""

async def use_yourself(instructions: str, wait_time: Optional[float] = 0.0, api_key: Optional[str] = None, debug: bool = False) -> None:
    """
    Run the computer assistant with given instructions
    
    Args:
        instructions (str): The instructions for the computer assistant to follow
        wait_time (Optional[float]): Wait time before actions in seconds. None for no wait. Defaults to 5.0
        api_key (Optional[str]): Anthropic API key. If None, will try to get from environment
        debug (bool): Enable debug mode for detailed error messages
    """
    from termcolor import cprint

    # ADD THE RESTRICTED COORDINATES TO INSTRUCTIONS
    instructions = f"{instructions}\n\nONLY USE THIS COORDINATES {COORDINATES} TO INPUT YOUR INSTRUCTIONS"

    try:
        # Display warning message
        cprint("""NOTE: Please be very careful running this script!! this runs locally on your machine(NO SANDBOX) 
        There is an artificial delay in script before each action so you can review them. 
        KEEP A WATCHFUL EYE ON IT! AND STOP THE SCRIPT DURING WAIT TIME IF IT TRIES TO DO SOMETHING YOU DONT WANT. 
        BY RUNNING THIS SCRIPT YOU ASSUME THE RESPONSIBILITY OF THE OUTCOMES""", "red")

        # Configure global wait time
        global WAIT_BEFORE_ACTION
        WAIT_BEFORE_ACTION = wait_time

        # Configure PyAutoGUI safety features
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.1

        # Get API key
        final_api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not final_api_key:
            raise ValueError("API key must be provided either as parameter or in ANTHROPIC_API_KEY environment variable")

        cprint(f"Initializing computer assistant...", "cyan")
        cprint(f"Wait time set to: {WAIT_BEFORE_ACTION if WAIT_BEFORE_ACTION is not None else 'No wait'}", "cyan")

        # Initialize API
        api = ComputerControlAPI(api_key=final_api_key)
        
        # Create initial message with instructions
        messages = [{
            "role": "user",
            "content": [{"type": "text", "text": instructions}]
        }]

        # Run conversation with initial instructions
        while True:
            try:
                response = api.client.beta.messages.create(
                    model=api.model,
                    messages=cast(List[MessageParam], messages),
                    system=api._get_system_prompt(),
                    tools=[api.computer_tool.to_params(), api.edit_tool.to_params()],
                    max_tokens=4096,
                    extra_headers={"anthropic-beta": "computer-use-2024-10-22"}
                )

                tool_calls = []
                cprint("\nAssistant's Plan:", "green")

                # Process response content
                for block in response.content:
                    if hasattr(block, 'text'):
                        cprint(f"\n{block.text}", "white")
                    if hasattr(block, 'type') and block.type == 'tool_use':
                        tool_calls.append({
                            "name": block.name,
                            "input": block.input,
                            "id": block.id
                        })
                        cprint(f"\n[Planning: {block.name} - {block.input}]", "yellow")

                messages.append({
                    "role": "assistant",
                    "content": response.content
                })

                if not tool_calls:
                    cprint("\nNo more actions to perform. Ending session.", "green")
                    break

                # Execute tools and collect results
                tool_results = []
                for tool_call in tool_calls:
                    try:
                        tool_name = tool_call.get("name")
                        tool_input = tool_call.get("input", {})
                        
                        tool = api.computer_tool if tool_name == "computer" else api.edit_tool
                        
                        cprint(f"\nExecuting {tool_name} with input: {tool_input}", "cyan")
                        
                        result = await tool(**tool_input)
                        
                        formatted_result = {
                            "type": "tool_result",
                            "tool_use_id": tool_call.get("id"),
                            "is_error": bool(result.error),
                            "content": api._format_tool_result(result)
                        }
                        
                        tool_results.append(formatted_result)
                        
                        if result.error:
                            cprint(f"\nError: {result.error}", "red")
                        elif result.output:
                            cprint(f"\nResult: {result.output}", "green")
                        
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        error_msg = f"\nError executing tool: {str(e)}"
                        cprint(error_msg, "red")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_call.get("id"),
                            "is_error": True,
                            "content": [{"type": "text", "text": f"Tool execution failed: {str(e)}"}]
                        })

                if tool_results:
                    messages.append({
                        "role": "user",
                        "content": tool_results
                    })

            except Exception as e:
                cprint(f"\nError in conversation loop: {str(e)}", "red")
                if debug:
                    import traceback
                    traceback.print_exc()
                break

    except KeyboardInterrupt:
        cprint("\nOperation cancelled by user", "yellow")
    except Exception as e:
        cprint(f"\nAn error occurred: {str(e)}", "red")
        if debug:
            import traceback
            traceback.print_exc()
    finally:
        cprint("\nComputer Assistant session ended", "green")



# Global debug flag
DEBUG = False  # Set to True for detailed error messages


