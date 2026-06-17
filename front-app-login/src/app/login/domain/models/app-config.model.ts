import { CoreAppConfig } from "@proteo/types";

export type CustomAppConfig = {
    CUSTOM_CONFIG: {
        [key:string]: string
    }
}
export type AppConfig = CoreAppConfig;
export type ExtendedAppConfig = AppConfig & CustomAppConfig;