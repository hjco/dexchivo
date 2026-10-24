let killSwitchEnabled = false;

export function isKillSwitchEnabled() {
  return killSwitchEnabled;
}

export function setKillSwitch(enabled: boolean) {
  killSwitchEnabled = enabled;
}
