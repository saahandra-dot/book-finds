export const colors = {
    background: '#DFF7F3',
    teal: '#6BA399',
    text: '#303A25',
    secondaryText: '#52665F',
    olive: '#637D3C',
    paleGreen: '#D5DFAD',
    paleBlue: '#CDE4EC',
    white: '#FFFFFF',
    yellow: '#FFF6AA',
} as const;

// export const bookUi = {
//     background: '#E4FAF4',
//     hero: '#5B9EA3',
//     ink: '#403F35',
//     green: '#648846',
//     paleGreen: '#D8E5B8',
//     mint: '#DFF0DB',
//     blue: '#CEE8F0',
//     muted: '#63736C',
//     border: '#ADC9C0',
// } as const;

export const bookUi = {
    background: colors.background,
    hero: colors.teal,
    ink: colors.text,
    green: colors.olive,
    paleGreen: colors.paleGreen,
    mint: colors.background,
    blue: colors.paleBlue,
    muted: colors.secondaryText,
    border: '#ACC9BD',
} as const;