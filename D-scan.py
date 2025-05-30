import os
import json

def scan_directory(base_path, max_depth=7):
    folder_map = {}

    for root, dirs, files in os.walk(base_path):
        # Compute the depth from the base
        depth = len(os.path.relpath(root, base_path).split(os.sep))
        if depth > max_depth:
            continue

        relative_path = os.path.relpath(root, base_path)
        if relative_path == ".":
            relative_path = "/"

        folder_map[relative_path] = files

    return folder_map

def save_structure_to_json(folder_structure, output_path):
    with open(output_path, 'w') as f:
        json.dump(folder_structure, f, indent=2)

# Execution context
if __name__ == "__main__":
    base_dir = os.getcwd()
    output_json_path = os.path.join(base_dir, "full_folder_structure.json")

    print(f"📁 Scanning directory: {base_dir}")
    structure = scan_directory(base_dir, max_depth=7)
    save_structure_to_json(structure, output_json_path)
    print(f"✅ Folder structure saved to: {output_json_path}")
