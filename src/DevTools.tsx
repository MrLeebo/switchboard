import React, { useState, useRef } from "react";
import Button from "./components/Button";
import cx from "clsx";
import CloseButton from "./components/CloseButton";
import OpenButton from "./components/OpenButton";
import useKeypress from "react-use-keypress";
import useOutsideClick from "./hooks/useOutsideClick";
import Checkbox from "./components/Checkbox";
import Select from "./components/Select";
import Field from "./components/Field";
import { buildUrl } from "./utils/url-utils";
import {
  CustomResponse,
  HttpSettings,
  DevToolsPosition,
  DevToolsDefaults,
} from "./types/types";
import { writeToClipboard } from "./utils/clipboard-utils";
import { useDevToolsState } from "./hooks/useDevToolsState";
import Input from "./components/Input";
import { useWorker } from "./hooks/useWorker";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./demo-app/ErrorFallback";
import HttpSettingForm from "./components/CustomResponseForm";
import { DevToolsConfig } from "./demo-app/demo-app-types";

export const customResponseDefaults = {
  delay: 0,
  status: 200,
  response: "",
};

interface DevToolsProps<TCustomSettings> {
  /** The app to render */
  appSlot: React.ReactNode;

  /** CSS to apply to the root element. */
  className?: string;

  /** Values for custom settings specified by the user. These values are passed to the mock API. */
  customSettings: TCustomSettings;

  /** Specify optional default values for various settings */
  defaults?: Partial<DevToolsDefaults>;

  /** HTTP settings for mock APIs and HTTP delays */
  httpSettings: HttpSettings;

  // TODO: Implement
  /** Specify a keyboard shortcut that toggles the window open/closed */
  openKeyboardShortcut?: string;

  /** Custom content and settings to render inside the devtools */
  children: React.ReactNode;
}

/** This component is useful to display custom devtools settings for your project */
export default function DevTools<TCustomSettings>({
  appSlot,
  children,
  httpSettings,
  customSettings,
  className,
  ...rest
}: DevToolsProps<TCustomSettings>) {
  const defaults = getDefaults();
  // These settings use the useDevToolsState hook so that the settings persist in localStorage and are optionally initialized via the URL
  const [openByDefault, setOpenByDefault] = useDevToolsState(
    "openByDefault",
    defaults.openByDefault
  );

  const [isOpen, setIsOpen] = useState(openByDefault);

  const [closeOnOutsideClick, setCloseOnOutsideClick] = useDevToolsState(
    "closeOnOutsideClick",
    defaults.closeOnOutsideClick
  );

  const [closeViaEscapeKey, setCloseViaEscapeKey] = useDevToolsState(
    "closeViaEscapeKey",
    defaults.closeViaEscapeKey
  );

  const [delay, setDelay, delayChanged] = useDevToolsState(
    "delay",
    defaults.delay
  );

  const [position, setPosition] = useDevToolsState<DevToolsPosition>(
    "position",
    defaults.position
  );

  const [customResponses, setCustomResponses] = useDevToolsState<
    CustomResponse[]
  >("customResponses", []);

  const ref = useRef<HTMLDivElement>(null);

  // Returns defaults that fallback to hard-coded defaults if the user doesn't specify a preference.
  // Note that these defaults only apply if the URL and localStorage don't specify a preference.
  function getDefaults() {
    const defaults: DevToolsDefaults = {
      closeOnOutsideClick: rest.defaults?.closeOnOutsideClick ?? false,
      closeViaEscapeKey: rest.defaults?.closeViaEscapeKey ?? true,
      delay: rest.defaults?.delay ?? 0,
      openByDefault: rest.defaults?.openByDefault ?? true,
      position: rest.defaults?.position ?? "top-left",
    };
    return defaults;
  }

  useKeypress("Escape", () => {
    if (closeViaEscapeKey) setIsOpen(false);
  });

  useOutsideClick(ref, () => {
    if (closeOnOutsideClick) setIsOpen(false);
  });

  const toggleOpen = () => setIsOpen(!isOpen);

  // Only copy settings to the URL that have been changed from the default.
  // This keeps the URL as short as possible.
  function getChangedSettings() {
    const urlConfig: Partial<DevToolsConfig> = {};
    if (defaults.position !== position) urlConfig.position = position;
    if (defaults.openByDefault !== openByDefault) {
      urlConfig.openByDefault = openByDefault;
    }
    if (defaults.delay != delay) urlConfig.delay = delay;
    if (customResponses.length > 0) urlConfig.customResponses = customResponses;
    return urlConfig;
  }

  async function copyDevToolsSettingsUrlToClipboard() {
    const urlConfig = getChangedSettings();
    const url = buildUrl(window.location.href, {
      ...urlConfig,
      ...customSettings,
    });
    try {
      await writeToClipboard(url);
      alert("URL copied to clipboard");
    } catch (err) {
      () => alert("Failed to copy settings URL to clipboard");
    }
  }

  const isReady = useWorker(httpSettings, {
    delay,
    customResponses,
    ...customSettings,
  });

  if (!isReady) return <p>Initializing...</p>;

  return (
    <>
      {/* Wrap app in ErrorBoundary so DevTools continue to display upon error */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {/* Passing a key to force the app to completely reinitialize when the userId changes. */}
        {appSlot}
      </ErrorBoundary>

      <section
        ref={ref}
        // TODO: Support drag and drop position.
        className={cx(
          "fixed p-4 border shadow-xl max-h-screen overflow-auto bg-white opacity-90",
          {
            "bottom-0": position.includes("bottom"),
            "top-0": position.includes("top"),
            "right-0": position.includes("right"),
            "left-0": position.includes("left"),
          },
          className
        )}
      >
        {isOpen ? (
          <>
            <div className="flex flex-row-reverse">
              <CloseButton aria-label="Close DevTools" onClick={toggleOpen} />
            </div>
            {children}

            <details open>
              <summary className="mt-4 font-bold">HTTP</summary>
              <Field>
                <Input
                  id="globalDelay"
                  width="full"
                  changed={delayChanged}
                  type="number"
                  label="Global Delay"
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value))}
                />
              </Field>

              <Field>
                <Select
                  width="full"
                  label="Customize Endpoint"
                  // Value need not change since the selected value disappears once selected.
                  value=""
                  onChange={(e) => {
                    setCustomResponses([
                      ...customResponses,
                      {
                        endpointName: e.target.value,
                        delay: customResponseDefaults.delay,
                        status: customResponseDefaults.status,
                        response: customResponseDefaults.response,
                      },
                    ]);
                  }}
                >
                  <option>Select Endpoint</option>
                  {httpSettings.endpoints
                    // Filter out endpoints that are already customized
                    .filter(
                      (e) => !customResponses.some((h) => h.endpointName === e)
                    )
                    .map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                </Select>
              </Field>

              {customResponses.map((setting) => (
                <HttpSettingForm
                  key={setting.endpointName}
                  customResponse={setting}
                  setCustomResponses={setCustomResponses}
                />
              ))}
            </details>

            <details className="mt-4" open>
              <summary className="mt-4 font-bold">General</summary>

              <Field>
                <Select
                  width="full"
                  label="Position"
                  value={position}
                  onChange={(e) =>
                    setPosition(e.target.value as DevToolsPosition)
                  }
                >
                  <option value="top-left">Top left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-right">Bottom right</option>
                </Select>
              </Field>

              <Field>
                <Checkbox
                  id="openByDefault"
                  label="Open by default"
                  onChange={() => setOpenByDefault(!openByDefault)}
                  checked={openByDefault}
                />
              </Field>

              <Field>
                <Checkbox
                  id="closeViaEscapeKey"
                  label="Close via escape key"
                  onChange={() => setCloseViaEscapeKey(!closeViaEscapeKey)}
                  checked={closeViaEscapeKey}
                />
              </Field>

              <Field>
                <Checkbox
                  id="closeOnOutsideClick"
                  label="Close on outside click"
                  onChange={() => setCloseOnOutsideClick(!closeOnOutsideClick)}
                  checked={closeOnOutsideClick}
                />
              </Field>

              {/* TODO: Implement Auto Reload */}
              {/* <Field>
              <Checkbox
                label="Auto Reload"
                onChange={(e) => {
                  setDevToolsConfig((config) => {
                    return { ...config, autoReload: e.target.checked };
                  });
                }}
                checked={devToolsConfig.autoReload}
              />
            </Field> */}

              <div className="flex flex-row">
                <Field>
                  <Button
                    className="mr-2"
                    onClick={copyDevToolsSettingsUrlToClipboard}
                  >
                    Copy Settings
                  </Button>
                </Field>

                <Field>
                  <Button
                    className="mr-2"
                    onClick={() => {
                      // TODO: Only clear devtools-related localStorage.
                      localStorage.clear();
                      window.location.reload();
                    }}
                  >
                    Clear Settings
                  </Button>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    onClick={() => window.location.reload()}
                  >
                    Reload
                  </Button>
                </Field>
              </div>
            </details>
          </>
        ) : (
          <OpenButton aria-label="Open DevTools" onClick={toggleOpen} />
        )}
      </section>
    </>
  );
}
