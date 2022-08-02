import App from "./App";
import DevTools, { DevToolsPosition } from "../DevTools";
import { useWorker } from "../useWorker";
import { DevToolsConfig, MockUser, Endpoint, endpoints } from "./types";
import Input from "./Input";
import Select from "./Select";
import { mockUsers, noTodos } from "./mocks/users.mocks";
import { useDevToolsState } from "../useDevToolsState";
import { ErrorBoundary } from "react-error-boundary";
import HttpSettingForm from "./HttpSettingForm";
import ErrorFallback from "./ErrorFallback";
import Field from "../Field";

// These defaults apply if the URL and localStorage are empty
export const defaultConfig: DevToolsConfig = {
  user: noTodos,
  delay: 0,
  http: [],
  position: "top-left",
  openByDefault: true,
};

export default function AppWithDevTools() {
  const [config, setConfig] = useDevToolsState<DevToolsConfig>(
    "devtools",
    defaultConfig
  );

  const isReady = useWorker(config);

  if (!isReady) return <p>Initializing Mock Service Worker...</p>;

  return (
    <>
      {/* Wrap app in ErrorBoundary so devtools continue to display upon error */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App user={config.user} />
      </ErrorBoundary>

      <DevTools
        position={config.position}
        openByDefault={config.openByDefault}
        setPosition={(position: DevToolsPosition) => {
          setConfig({ ...config, position });
        }}
        setOpenByDefault={(newVal) => {
          setConfig({ ...config, openByDefault: newVal });
        }}
        closeViaEscapeKey
      >
        <>
          <div>
            <Select
              id="user"
              label="User"
              value={config.user.id}
              onChange={(e) => {
                const user = mockUsers.find(
                  (u) => u.id === parseInt(e.target.value)
                ) as MockUser;
                setConfig({ ...config, user });
              }}
            >
              {mockUsers.map((u) => (
                <option value={u.id} key={u.id}>
                  {u.name} ({u.description.role}, {u.description.todos})
                </option>
              ))}
            </Select>
          </div>

          <details>
            <summary className="mt-4 font-bold">HTTP</summary>
            <Field>
              <Input
                type="number"
                label="Global Delay (ms)"
                value={config.delay}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    delay: parseInt(e.target.value),
                  })
                }
              />
            </Field>

            <Field>
              <Select
                label="Customize Endpoint"
                // Value need not change since the selected value disappears once selected.
                value=""
                onChange={(e) => {
                  setConfig({
                    ...config,
                    http: [
                      ...config.http,
                      {
                        endpoint: e.target.value as Endpoint,
                        delay: 0,
                        status: 200,
                        response: "default",
                      },
                    ],
                  });
                }}
              >
                <option>Select Endpoint</option>
                {endpoints
                  // Filter out endpoints that are already customized
                  .filter((e) => !config.http.some((h) => h.endpoint === e))
                  .map((e) => (
                    <option key={e}>{e}</option>
                  ))}
              </Select>
            </Field>

            {config.http.map((httpSetting) => (
              <HttpSettingForm
                key={httpSetting.endpoint}
                httpSetting={httpSetting}
                setConfig={setConfig}
              />
            ))}
          </details>
        </>
      </DevTools>
    </>
  );
}
