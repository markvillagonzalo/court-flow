type CssModuleMap = Record<string, string | undefined>;

export function cx(classNames: string, ...modules: CssModuleMap[]) {
  return classNames
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => {
      for (const module of modules) {
        if (module[name]) return module[name];
      }
      return name;
    })
    .join(' ');
}
