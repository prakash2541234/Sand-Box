def ask_confirmation(message):
    print()
    print("CONFIRMATION REQUIRED")
    print(message)

    while True:
        answer = input("Type yes or no: ").strip().lower()

        if answer in ["yes", "y"]:
            return True

        if answer in ["no", "n"]:
            return False

        print("Please type yes or no.")


def process_command(command):
    command = command.strip()

    if not command:
        return True

    lower_command = command.lower()

    # Stop agent
    if lower_command in ["exit", "quit", "stop"]:
        print("Agent stopped.")
        return False

    # Open application
    if lower_command.startswith("open "):
        app_name = command[5:].strip()

        print(f"Requested application: {app_name}")
        print("Application-opening capability will be connected later.")

        return True

    # Type text
    if lower_command.startswith("type "):
        text = command[5:]

        print(f"Text to type: {text}")
        print("Typing capability will be connected later.")

        return True

    # Press key
    if lower_command.startswith("press "):
        key = command[6:].strip()

        print(f"Key requested: {key}")
        print("Keyboard-control capability will be connected later.")

        return True

    # Screenshot
    if lower_command in ["screenshot", "take screenshot"]:
        print("Screenshot requested.")
        print("Screen-capture capability will be connected later.")

        return True

    # Sensitive action
    if lower_command.startswith("send "):
        message = command[5:]

        confirmed = ask_confirmation(
            f"Do you want me to send this message?\n\n{message}"
        )

        if confirmed:
            print("Confirmed.")
            print("The send action would execute here.")
        else:
            print("Action cancelled.")

        return True

    print("I don't understand that command yet.")
    return True


def main():
    print("=" * 50)
    print("Desktop Agent V1")
    print("=" * 50)

    print()
    print("Commands:")
    print("  open notepad")
    print("  type hello world")
    print("  press enter")
    print("  screenshot")
    print("  send hello")
    print("  exit")
    print()

    while True:
        command = input("You > ")

        if not process_command(command):
            break


if __name__ == "__main__":
    main()
