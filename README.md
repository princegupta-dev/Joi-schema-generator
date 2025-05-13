# Joi Schema and Postman payload JSON Generator

This Visual Studio Code extension allows you to convert sequelize-typescript models into Joi validation schemas along with Postman sample payloads.

## Features

- Converts Sequelize-style models to Joi schema.
- Skips fields like `id`, `created_at`, `updated_at`, `deleted_at`, etc.
- Automatically generates a sample payload for Postman.

## Usage

1. Open your model file.
2. Run the `Convert JSON to Joi` command from the Command Palette or press **Ctrl+Shift+P**.
3. Joi schema and Postman sample will be inserted at the top of your file.

## Requirements

No additional setup required.

---

Made with ❤️ by Prince Gupta.
