import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../services/api.service.js";
import { EyeIcon, EyeOffIcon, CloseIcon, AlertIcon, LinkIcon, LockIcon, CheckIcon, SearchIcon } from "./ui/Icons";
import { validateAwsName } from "../utils/awsNameValidator";

const inputStyle = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 14,
  padding: "10px 14px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "var(--sans)",
  boxSizing: "border-box",
};

const inputFocusStyle = {
  borderColor: "var(--border-focus)",
  boxShadow: "0 0 0 3px rgba(9, 105, 218, 0.15)",
};

const inputErrorStyle = {
  borderColor: "var(--error)",
  background: "var(--error-bg)",
};

function getDataSource(field) {
  return field.dataSource || field.dynamicSource;
}

function matchesCondition(condition, formData) {
  if (!condition?.field) return true;
  const currentVal = formData?.[condition.field];

  if (condition.operator) {
    if (condition.operator === "equals") {
      return currentVal === condition.value;
    }
    if (condition.operator === "not_equals") {
      return currentVal !== condition.value;
    }
    if (condition.operator === "in" && Array.isArray(condition.value)) {
      return condition.value.includes(currentVal);
    }
  }

  return currentVal === condition.equals;
}

function shouldShowField(field, formData) {
  if (field.visibleWhen && !matchesCondition(field.visibleWhen, formData)) {
    return false;
  }
  if (field.omitWhen && matchesCondition(field.omitWhen, formData)) {
    return false;
  }
  return true;
}

function inferType(field) {
  if (getDataSource(field)) return "dynamic";
  
  const keyLower = String(field.key || "").toLowerCase();
  if (
    field.type === "password" ||
    keyLower.includes("password") ||
    keyLower.includes("secretkey") ||
    keyLower.includes("adminpassword")
  ) {
    return "password";
  }

  if (field.type === "code") {
    return "code";
  }

  if (
    field.validation?.enum ||
    field.enumValues ||
    field.type === "enum" ||
    field.type === "select" ||
    Array.isArray(field.options)
  ) {
    return "enum";
  }
  if (field.validation?.list || field.type === "list" || field.type === "array") {
    return "list";
  }
  if (field.validation?.map || field.type === "map" || field.type === "object") {
    return "map";
  }
  if (field.validation?.multiline || field.type === "multiline") {
    return "multiline";
  }
  if (field.type === "boolean" || typeof field.default === "boolean") {
    return "boolean";
  }
  if (field.type === "number" || typeof field.default === "number") {
    return "number";
  }
  return field.type || "string";
}

function validateField(field, value) {
  if (field.required && (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))) {
    return `${field.label || field.key} is required.`;
  }

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const v = field.validation;
  if (!v) return null;

  if (typeof value === "string") {
    if (v.minLength !== undefined && value.length < v.minLength) {
      return `Must be at least ${v.minLength} characters.`;
    }
    if (v.maxLength !== undefined && value.length > v.maxLength) {
      return `Must be at most ${v.maxLength} characters.`;
    }
    if (v.regex) {
      try {
        const re = new RegExp(v.regex);
        if (!re.test(value)) {
          return `Does not match format (${v.regex})`;
        }
      } catch {
        // Ignore invalid regex in schema
      }
    }
  }

  if (typeof value === "number" || (!isNaN(Number(value)) && typeof value !== "boolean")) {
    const num = Number(value);
    if (v.min !== undefined && num < v.min) {
      return `Minimum value is ${v.min}.`;
    }
    if (v.max !== undefined && num > v.max) {
      return `Maximum value is ${v.max}.`;
    }
  }

  return null;
}

// ─── Input Components ────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  const on = !!value;
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        userSelect: "none",
        padding: "4px 0",
      }}
    >
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: on ? "var(--accent)" : "var(--border)",
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: on ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#ffffff",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 13,
          color: on ? "var(--text)" : "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        {on ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, hasError }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type={visible ? "text" : "password"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter password"}
        style={{
          ...inputStyle,
          paddingRight: 42,
          ...(hasError ? inputErrorStyle : {}),
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 15,
          padding: 4,
          display: "flex",
          alignItems: "center",
        }}
        title={visible ? "Hide sensitive value" : "Reveal sensitive value"}
      >
        {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
    </div>
  );
}

function DynamicSelect({ field, value, onChange, formData, hasError }) {
  const [options, setOptions] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const source = getDataSource(field);
  const multiple = source?.multiple === true || field.validation?.list === true;

  // Compute dependency values (handles string or array dependsOn)
  const dependencyValues = useMemo(() => {
    if (!source?.dependsOn) return {};
    const deps = Array.isArray(source.dependsOn) ? source.dependsOn : [source.dependsOn];
    const out = {};
    for (const d of deps) {
      out[d] = formData[d];
    }
    return out;
  }, [source?.dependsOn, formData]);

  useEffect(() => {
    async function fetchOptions() {
      if (!source?.endpoint) {
        if (Array.isArray(field.options)) {
          setOptions(
            field.options.map((opt) =>
              typeof opt === "object" && opt !== null ? opt : { label: String(opt), value: String(opt) }
            )
          );
        }
        return;
      }
      try {
        setLoading(true);
        setError("");
        const params = { ...(source.filters || {}) };

        if (source.queryParam) {
          const firstVal = Object.values(dependencyValues)[0];
          if (firstVal) params[source.queryParam] = firstVal;
        } else {
          Object.assign(params, dependencyValues);
        }

        const fetched = await apiClient.fetchDynamicOptions(source.endpoint, params);
        setOptions(Array.isArray(fetched) ? fetched : []);
      } catch (err) {
        console.error(`[DynamicSelect] ${source.endpoint} failed:`, err);
        // Fallback to field.options if present
        if (Array.isArray(field.options) && field.options.length > 0) {
          setOptions(
            field.options.map((opt) =>
              typeof opt === "object" && opt !== null ? opt : { label: String(opt), value: String(opt) }
            )
          );
        } else {
          setOptions([]);
          setError("Unable to load options from provider");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, [source?.endpoint, JSON.stringify(dependencyValues), JSON.stringify(source?.filters)]);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return options;
    const term = searchFilter.toLowerCase();
    return options.filter((opt) =>
      (opt.label || opt.value || "").toLowerCase().includes(term) ||
      (opt.description || "").toLowerCase().includes(term) ||
      (opt.category || "").toLowerCase().includes(term)
    );
  }, [options, searchFilter]);

  if (multiple) {
    const selectedArr = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.length > 6 && (
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search options..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                ...inputStyle,
                padding: "6px 10px 6px 28px",
                fontSize: 12,
                background: "var(--surface-2)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
              }}
            >
              <SearchIcon size={12} />
            </div>
          </div>
        )}
        <select
          multiple
          value={selectedArr}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions, (o) => o.value))
          }
          style={{
            ...inputStyle,
            minHeight: 120,
            ...(hasError ? inputErrorStyle : {}),
          }}
        >
          {filteredOptions.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description || opt.label}>
              {opt.label || opt.value}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)" }}>
          <span>Hold Ctrl (Windows) / Cmd (Mac) to select multiple</span>
          <span>{selectedArr.length} selected</span>
        </div>
        {loading && (
          <div style={{ fontSize: 12, color: "var(--accent)" }}>
            Loading options...
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: "var(--error)" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.length > 8 && (
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search options..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              ...inputStyle,
              padding: "6px 10px 6px 28px",
              fontSize: 12,
              background: "var(--surface-2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 9,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-dim)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <SearchIcon size={12} />
          </div>
        </div>
      )}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          ...(hasError ? inputErrorStyle : {}),
        }}
      >
        <option value="">{loading ? "Loading options..." : "-- Select an option --"}</option>
        {filteredOptions.map((opt) => (
          <option key={opt.value} value={opt.value} title={opt.description || opt.label}>
            {opt.label || opt.value}
          </option>
        ))}
      </select>
      {loading && (
        <div style={{ fontSize: 12, color: "var(--accent)" }}>
          Fetching from provider...
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: "var(--error)" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function TagListInput({ value = [], onChange, placeholder, hasError }) {
  const [draft, setDraft] = useState("");
  const items = Array.isArray(value) ? value : [];

  function addItem() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setDraft("");
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addItem();
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${hasError ? "var(--error)" : "var(--border)"}`,
        borderRadius: 8,
        background: "var(--surface)",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((item, idx) => (
            <span
              key={`${item}-${idx}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "3px 10px",
                fontSize: 12,
                color: "var(--text)",
                fontFamily: "var(--mono)",
              }}
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(idx)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <CloseIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type item and press Enter or comma"}
          style={{
            ...inputStyle,
            border: "none",
            padding: "6px 8px",
            fontSize: 13,
            background: "transparent",
          }}
        />
        <button
          type="button"
          onClick={addItem}
          style={{
            padding: "5px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text)",
            flexShrink: 0,
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function KeyValueMapInput({ value = {}, onChange, hasError }) {
  const entries = useMemo(() => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.entries(value);
    }
    return [];
  }, [value]);

  function updateEntry(index, newKey, newVal) {
    const updated = {};
    entries.forEach(([k, v], idx) => {
      if (idx === index) {
        if (newKey) updated[newKey] = newVal;
      } else {
        updated[k] = v;
      }
    });
    onChange(updated);
  }

  function addEntry() {
    let keyName = "key";
    let counter = 1;
    while (value?.[`${keyName}_${counter}`]) counter++;
    onChange({ ...(value || {}), [`${keyName}_${counter}`]: "" });
  }

  function removeEntry(keyToRemove) {
    const updated = { ...(value || {}) };
    delete updated[keyToRemove];
    onChange(updated);
  }

  return (
    <div
      style={{
        border: `1px solid ${hasError ? "var(--error)" : "var(--border)"}`,
        borderRadius: 8,
        background: "var(--surface)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {entries.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>
          No properties configured. Click "+ Add Property" to add tags or key-value attributes.
        </div>
      ) : (
        entries.map(([k, v], idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Key"
              value={k}
              onChange={(e) => updateEntry(idx, e.target.value, v)}
              style={{ ...inputStyle, flex: "1 1 40%", padding: "7px 10px", fontSize: 13 }}
            />
            <span style={{ color: "var(--text-dim)", fontWeight: 700 }}>=</span>
            <input
              type="text"
              placeholder="Value"
              value={v}
              onChange={(e) => updateEntry(idx, k, e.target.value)}
              style={{ ...inputStyle, flex: "1 1 50%", padding: "7px 10px", fontSize: 13 }}
            />
            <button
              type="button"
              onClick={() => removeEntry(k)}
              title="Remove"
              style={{
                border: "none",
                background: "var(--surface-3)",
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: "pointer",
                color: "var(--error)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CloseIcon size={13} color="var(--error)" />
            </button>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={addEntry}
        style={{
          alignSelf: "flex-start",
          padding: "6px 14px",
          borderRadius: 6,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        + Add Property
      </button>
    </div>
  );
}

// ─── Field Controller ────────────────────────────────────────────────────────

function GenericFieldRenderer({ schema, field, value, onChange, formData, lockInfo }) {
  const type = inferType(field);
  const error = validateField(field, value);
  const hasError = !lockInfo?.isLocked && !!error;

  // AWS Resource Real-Time Name Validation
  const isAws =
    schema?.providerKey === "aws" ||
    schema?.terraformType?.startsWith("aws_") ||
    schema?.canvasType?.startsWith("aws-");

  const isNameField =
    ["name", "bucket", "identifier", "tableName", "queueName", "topicName"].includes(field.key) ||
    field.tfPath === "name" ||
    field.tfPath === "bucket";

  let awsNameValidation = null;
  if (isAws && isNameField && value !== undefined && value !== null && String(value).trim() !== "") {
    awsNameValidation = validateAwsName(schema.canvasType || schema.terraformType, String(value), {
      isFifo: formData?.fifoQueue === true || formData?.fifoTopic === true,
    });
  }

  let controlNode = null;

  switch (type) {
    case "dynamic":
      controlNode = (
        <DynamicSelect
          field={field}
          value={value}
          onChange={onChange}
          formData={formData}
          hasError={hasError}
        />
      );
      break;

    case "boolean":
      controlNode = <Toggle value={value} onChange={onChange} />;
      break;

    case "password":
      controlNode = (
        <PasswordInput
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          hasError={hasError}
        />
      );
      break;

    case "enum": {
      const rawOptions = field.options || field.validation?.enum || field.enumValues || [];
      const options = rawOptions.map((opt) =>
        typeof opt === "object" && opt !== null ? opt : { label: String(opt), value: String(opt) }
      );
      controlNode = (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputStyle,
            ...(hasError ? inputErrorStyle : {}),
            cursor: "pointer",
            background: "var(--surface)",
            color: "var(--text)",
          }}
        >
          <option value="" style={{ background: "var(--surface)", color: "var(--text)" }}>
            -- Select {field.label} --
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              title={opt.description || opt.label}
              style={{ background: "var(--surface)", color: "var(--text)" }}
            >
              {opt.label || opt.value}
            </option>
          ))}
        </select>
      );
      break;
    }

    case "number":
      controlNode = (
        <input
          type="number"
          value={value ?? ""}
          min={field.validation?.min}
          max={field.validation?.max}
          step={field.validation?.step || "any"}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? "" : Number(v));
          }}
          placeholder={field.placeholder}
          style={{
            ...inputStyle,
            ...(hasError ? inputErrorStyle : {}),
          }}
        />
      );
      break;

    case "list":
      controlNode = (
        <TagListInput
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          hasError={hasError}
        />
      );
      break;

    case "map":
      controlNode = (
        <KeyValueMapInput
          value={value}
          onChange={onChange}
          hasError={hasError}
        />
      );
      break;

    case "code":
    case "multiline":
      controlNode = (
        <textarea
          rows={type === "code" ? 7 : 5}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Enter script or policy JSON document"}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "var(--mono)",
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: "pre",
            tabSize: 2,
            ...(hasError ? inputErrorStyle : {}),
          }}
        />
      );
      break;

    default:
      controlNode = (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label}`}
          style={{
            ...inputStyle,
            ...(hasError ? inputErrorStyle : {}),
          }}
        />
      );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, width: "100%" }}>
      {/* Label and badges */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minWidth: 0,
        }}
      >
        <label
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--text)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={field.label}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {field.label}
          </span>
          {field.required && (
            <span
              style={{ color: "var(--error)", fontSize: 13, fontWeight: 700, flexShrink: 0 }}
              title="Required field"
            >
              *
            </span>
          )}
        </label>

        {field.tfPath && (
          <span
            title={`Terraform attribute: ${field.tfPath}`}
            style={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: "var(--text-dim)",
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              padding: "1px 7px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 160,
              flexShrink: 0,
              cursor: "help",
            }}
          >
            {field.tfPath.split(".").pop()}
          </span>
        )}
      </div>

      {/* Field description helper (if provided in schema) */}
      {field.description && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.35,
            marginTop: -2,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {field.description}
        </div>
      )}

      {/* Warning text callout (if property is immutable or destructive) */}
      {field.warningText && (
        <div
          style={{
            background: "rgba(217, 119, 6, 0.08)",
            border: "1px solid rgba(217, 119, 6, 0.25)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertIcon size={14} color="#d97706" />
          <span>{field.warningText}</span>
        </div>
      )}

      {/* Input control or Locked Canvas Connection */}
      {lockInfo?.isLocked ? (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
              <LinkIcon size={14} />
              <span>Connected via Canvas</span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-dim)" }}>
              {lockInfo.isMulti ? `${lockInfo.sources.length} Connected` : "1 Connected"}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {lockInfo.sources.map((src) => (
              <div
                key={src.edgeId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface)",
                  border: `1px solid ${src.color || "var(--border)"}`,
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  fontFamily: "var(--mono)",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: src.color || "var(--accent)",
                  }}
                />
                <span>{src.sourceInstanceName}</span>
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                  ({src.sourceDisplayName})
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.3 }}>
            This field inherits its value from the canvas connection. Disconnect the wire on the canvas to edit manually.
          </div>
        </div>
      ) : (
        controlNode
      )}

      {/* Real-time AWS Name Validation Feedback */}
      {!lockInfo?.isLocked && awsNameValidation && !awsNameValidation.valid && (
        <div
          style={{
            fontSize: 12,
            color: "var(--error)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            borderRadius: 6,
            padding: "6px 10px",
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          <AlertIcon size={14} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>AWS Name Validation: {awsNameValidation.error}</span>
        </div>
      )}

      {!lockInfo?.isLocked && awsNameValidation && awsNameValidation.valid && (
        <div
          style={{
            fontSize: 11,
            color: "#10B981",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 0",
          }}
        >
          <CheckIcon size={13} color="#10B981" />
          <span>Valid AWS resource name</span>
        </div>
      )}

      {/* Field error */}
      {!lockInfo?.isLocked && !awsNameValidation?.error && error && (
        <div
          style={{
            fontSize: 12,
            color: "var(--error)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 2,
          }}
        >
          <AlertIcon size={12} color="var(--error)" />
          <span>{error}</span>
        </div>
      )}

      {/* Help text */}
      {field.helpText && (
        <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.4 }}>
          {field.helpText}
        </div>
      )}
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ schema, section, fields, formData, setFormData, lockedFields = {} }) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? true);

  const visibleFields = useMemo(() => {
    return (fields || []).filter((f) => shouldShowField(f, formData));
  }, [fields, formData]);

  const requiredCount = visibleFields.filter((f) => f.required && !lockedFields[f.key]?.isLocked).length;

  function handleChange(key, value) {
    if (key === "trustedService" && schema?.canvasType === "aws-iam-role") {
      const assumePolicy = JSON.stringify(
        {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "sts:AssumeRole",
              Effect: "Allow",
              Principal: {
                Service: value,
              },
            },
          ],
        },
        null,
        2
      );
      setFormData((prev) => ({
        ...prev,
        trustedService: value,
        assumeRolePolicy: assumePolicy,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        onClick={() => section.collapsible && setExpanded((p) => !p)}
        style={{
          padding: "14px 20px",
          background: "var(--surface-2)",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          cursor: section.collapsible ? "pointer" : "default",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--text)",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>{section.label}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 12,
              background: "var(--surface-3)",
              color: "var(--text-muted)",
            }}
          >
            {visibleFields.length} field{visibleFields.length !== 1 ? "s" : ""}
          </span>
          {requiredCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--error-bg)",
                color: "var(--error)",
                border: "1px solid var(--error-border)",
              }}
            >
              {requiredCount} required
            </span>
          )}
        </div>

        {section.collapsible && (
          <span style={{ color: "var(--text-dim)", fontSize: 18, lineHeight: 1 }}>
            {expanded ? "−" : "+"}
          </span>
        )}
      </div>

      {expanded && (
        <div
          style={{
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {visibleFields.map((field) => (
            <div
              key={field.key}
              style={{
                minWidth: 0,
                width: "100%",
                gridColumn:
                  field.type === "code" ||
                  field.type === "multiline" ||
                  field.type === "map" ||
                  field.type === "list" ||
                  field.fullWidth
                    ? "1 / -1"
                    : undefined,
              }}
            >
              <GenericFieldRenderer
                schema={schema}
                field={field}
                value={formData[field.key]}
                formData={formData}
                onChange={(val) => handleChange(field.key, val)}
                lockInfo={lockedFields[field.key]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main DynamicForm Export ─────────────────────────────────────────────────

export default function DynamicForm({ schema, formData, setFormData, lockedFields = {} }) {
  if (!schema) return null;

  const sections = useMemo(() => {
    return [...(schema.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [schema.sections]);

  const fieldsBySection = useMemo(() => {
    const map = {};
    for (const section of sections) {
      map[section.key] = (schema.fields || [])
        .filter((f) => (f.sectionKey || f.section) === section.key)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    // Collect orphaned fields into general section if needed
    const sectionKeys = new Set(sections.map((s) => s.key));
    const orphaned = (schema.fields || []).filter(
      (f) => !sectionKeys.has(f.sectionKey || f.section)
    );
    if (orphaned.length > 0) {
      const fallbackKey = sections[0]?.key || "general";
      map[fallbackKey] = [...(map[fallbackKey] || []), ...orphaned];
    }
    return map;
  }, [sections, schema.fields]);

  return (
    <div>
      {sections.map((section) => (
        <SectionCard
          key={section.key}
          schema={schema}
          section={section}
          fields={fieldsBySection[section.key]}
          formData={formData}
          setFormData={setFormData}
          lockedFields={lockedFields}
        />
      ))}
    </div>
  );
}
