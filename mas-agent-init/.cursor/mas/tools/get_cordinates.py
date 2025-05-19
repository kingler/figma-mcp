import pyautogui
import keyboard
from termcolor import cprint
from pynput import mouse

# Constants
RUNNING = True
TARGET_WIDTH = 1280
TARGET_HEIGHT = 800
SCREEN_WIDTH, SCREEN_HEIGHT = pyautogui.size()

def scale_coordinates(x: int, y: int) -> tuple[int, int]:
    """Scale coordinates from actual screen resolution to target resolution"""
    scaled_x = int((x / SCREEN_WIDTH) * TARGET_WIDTH)
    scaled_y = int((y / SCREEN_HEIGHT) * TARGET_HEIGHT) 
    return scaled_x, scaled_y

def get_coordinates():
    try:
        cprint("Starting coordinate tracker...", "cyan")
        cprint(f"Scaling coordinates to {TARGET_WIDTH}x{TARGET_HEIGHT} resolution", "cyan")
        cprint("Press 'q' to quit", "yellow")
        cprint("Click anywhere to get coordinates", "green")
        
        global RUNNING
        RUNNING = True
        
        # Mouse listener callback
        def on_click(x, y, button, pressed):
            if pressed and RUNNING:
                scaled_x, scaled_y = scale_coordinates(x, y)
                cprint(f"Original coordinates: x={x}, y={y}", "white")
                cprint(f"Scaled coordinates: x={scaled_x}, y={scaled_y}", "green")
                
                # Try to get any UI element at those coordinates
                try:
                    element = pyautogui.locateOnScreen(None, region=(x-5, y-5, 10, 10))
                    if element:
                        cprint("Clickable element detected at this position", "blue")
                except Exception as e:
                    cprint(f"Could not check for UI element: {str(e)}", "yellow")

        def stop_listener():
            global RUNNING
            RUNNING = False
            cprint("Stopping coordinate tracker...", "red")
            
        # Register quit hotkey
        keyboard.on_press_key('q', lambda _: stop_listener())
        
        # Start mouse listener
        with mouse.Listener(on_click=on_click) as listener:
            listener.join()
                
    except Exception as e:
        cprint(f"An error occurred: {str(e)}", "red")
    finally:
        cprint("Coordinate tracker stopped", "yellow")

if __name__ == "__main__":
    get_coordinates()
