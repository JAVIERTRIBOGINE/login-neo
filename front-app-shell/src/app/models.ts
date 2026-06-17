export interface ShellMenuItem {
  path: string;
  label: string;
  icon: string;
}

export interface ResourcesResponse {
  resources: ShellMenuItem[];
}
