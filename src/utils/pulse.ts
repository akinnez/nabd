import { PulseConfig } from "../types/utils";

const _config: PulseConfig = {
  middleware: []
};
export const Pulse = {
  configure: (cfg: Partial<PulseConfig>) => {
    if (cfg.middleware) _config.middleware = [..._config.middleware, ...cfg.middleware];
  },
  getConfig: () => _config
};