# Countries search — Data Guide

## Structure

Each country entry in `apps/web/public/countries.json` follows this shape:

```json
{
  "name": "Denmark",
  "code": "DK",
  "languages": ["danish"],
  "flag_colors": ["red", "white"],
  "region": "Northern Europe"
}
```

### name
Use the commonly recognized country or territory name.

### code
Use the canonical country/territory code.

### flag_colors
Canonical color names only: `red`, `white`, `blue`, `green`, `yellow`, `black`, `orange`, `purple`.

### languages
The official or widely spoken languages.

### region
Consistent values — don't mix "Europe" and "Western Europe" for the same type of country.

| Region | Examples |
|---|---|
| Northern Europe | Denmark, Sweden, Norway, Finland, Iceland |
| Western Europe | France, Germany, Switzerland, UK, Netherlands |
| Southern Europe | Italy, Spain, Greece, Portugal |
| Eastern Europe | Poland, Russia, Czech Republic, Hungary |
| Middle East | Saudi Arabia, UAE, Israel, Turkey |
| East Asia | Japan, China, South Korea |
| Southeast Asia | Thailand, Vietnam, Indonesia, Singapore |
| South Asia | India, Pakistan, Bangladesh |
| Central Asia | Kazakhstan, Uzbekistan |
| North Africa | Egypt, Morocco, Tunisia |
| Sub-Saharan Africa | Nigeria, Kenya, South Africa, Ethiopia |
| North America | USA, Canada, Mexico |
| Central America | Panama, Costa Rica, Guatemala |
| Caribbean | Cuba, Bahamas, Jamaica |
| South America | Brazil, Argentina, Colombia |
| Oceania | Australia, New Zealand |
| Atlantic Ocean | Ascension Island, Saint Helena |
| North Atlantic | Bermuda |
