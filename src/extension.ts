import * as vscode from "vscode";
// CONSTANTS
const SKIPPED_KEYS = ["id", "created_at", "updated_at", "deleted_at"];

// Main entry point
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.convertJsonToJoi",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor found");
        return;
      }
      const document = editor.document;
      const content = document.getText();

      try {
        const { joiSchema, skippedFields, samplePayload } =
          generateJoiSchema(content);
        insertJoiSchemaInEditor(editor, joiSchema, samplePayload);
        vscode.window.showInformationMessage(
          "Joi schema generated successfully!"
        );
        vscode.window.showInformationMessage(
          `Joi schema & Postman payload generated. Skipped: ${skippedFields.join(
            ", "
          )}`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    }
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}

function generateJoiSchema(modelText: string): {
  joiSchema: string;
  skippedFields: string[];
  samplePayload: string;
} {
  const lines = modelText.split("\n");
  const schema: Record<string, string> = {};
  const skippedFields: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("@Column")) {
      const typeLine = lines[i + 1]?.trim() || "";
      const match = typeLine.match(/(\w+)(?:!|\?)?:\s*(\w+(\s*\|\s*\w+)*)/);
      if (!match) continue;
      const [, key, type] = match;
      if (SKIPPED_KEYS.includes(key)) {
        skippedFields.push(key);
        continue;
      }
      const joiType = determineJoiType(type, key, line);
      schema[key] = joiType;
    }
  }
  const payload = createSamplePayload(schema);
  return {
    joiSchema: createJoiSchemaString(schema),
    skippedFields,
    samplePayload: payload,
  };
}

// Create Joi schema string from the schema object
function createJoiSchemaString(schema: Record<string, string>): string {
  let joiString = "const schema = Joi.object({\n";
  for (const [key, value] of Object.entries(schema)) {
    joiString += `  ${key}: ${value},\n`;
  }
  joiString += "});\n\n";
  return joiString;
}

// Determine the Joi type based on Sequelize type
function determineJoiType(type: string, key: string, line: string): string {
  let joiType = "Joi.string()";

  if (isNumberType(type)) {
    joiType = "Joi.number()";
  } else if (isBooleanType(type)) {
    joiType = "Joi.boolean()";
  } else if (isEnumType(type)) {
    const enumValues = extractEnumValues(type);
    joiType = `Joi.string().valid(...${enumValues})`;
  }

  if (line.includes("allowNull: false")) {
    joiType += ".required()";
  } else {
    joiType += '.optional().allow("")';
  }

  joiType = applyCustomValidations(key, joiType);
  return joiType;
}

// Check if type is numeric
function isNumberType(type: string): boolean {
  return ["INTEGER", "BIGINT", "NUMBER"].includes(type.toUpperCase());
}

// Check if type is Boolean
function isBooleanType(type: string): boolean {
  return type.toUpperCase() === "BOOLEAN";
}

// Check if type is Enum
function isEnumType(type: string): boolean {
  return type.toUpperCase().includes("ENUM");
}

// Extract enum values from a type string
function extractEnumValues(type: string): string[] {
  const enumValues = type.match(/'([^']+)'/g);
  return enumValues ? enumValues.map((val) => val.replace(/'/g, "")) : [];
}

// Apply custom validations based on field name
function applyCustomValidations(key: string, joiType: string): string {
  if (key.includes("phone_number") || key.includes("mobile_number")) {
    joiType = `Joi.string().pattern(/^[6-9]\\d{9}$/).required()`;
  } else if (key.includes("email")) {
    joiType = `Joi.string().email().required()`;
  } else if (key.includes("url") || key.includes("website")) {
    joiType = `Joi.string().uri().optional()`;
  } else if (key.includes("date")) {
    joiType = `Joi.date().optional()`;
  } else if (key === "otp") {
    joiType = `Joi.string().min(4).max(4).required()`;
  }

  return joiType;
}

// Insert Joi schema into the editor with proper spacing
function insertJoiSchemaInEditor(
  editor: vscode.TextEditor,
  joiValidation: string,
  samplePayload: string
) {
  const combinedOutput = `
// Joi Schema Generated
${joiValidation}

// Postman JSON Payload Sample
const payload = ${samplePayload};
`;

  editor.edit((editBuilder) => {
    editBuilder.insert(new vscode.Position(0, 0), `\n\n${combinedOutput}`);
  });
}

// 🔧 New function to generate sample Postman JSON payload
function createSamplePayload(schema: Record<string, string>): string {
  const payload: Record<string, any> = {};

  for (const key in schema) {
    const value = schema[key];

    if (value.includes("number")) {
      payload[key] = 123;
    } else if (value.includes("boolean")) {
      payload[key] = true;
    } else if (value.includes("email")) {
      payload[key] = "example@example.com";
    } else if (value.includes("uri")) {
      payload[key] = "https://example.com";
    } else if (value.includes("date")) {
      payload[key] = new Date().toISOString();
    } else if (value.includes("valid(...")) {
      // Extract the first enum value
      const match = value.match(/valid\(\.\.\.(\[.*?\])\)/);
      if (match) {
        try {
          const enumArray = JSON.parse(match[1]);
          payload[key] = enumArray[0];
        } catch {
          payload[key] = "enum_value";
        }
      }
    } else {
      payload[key] = "sample_value";
    }
  }

  return JSON.stringify(payload, null, 2);
}
