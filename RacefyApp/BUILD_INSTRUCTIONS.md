F# EAS Build Instructions

## Before Building

Copy the correct `google-services.json` for your target environment:

### Development Build
```bash
cp google-services-dev.json google-services.json
eas build --platform android --profile development
```

### Staging Build
```bash
cp google-services-staging.json google-services.json
eas build --platform android --profile staging
```

### Production Build
```bash
cp google-services-production.json google-services.json
eas build --platform android --profile production
```

## Quick Commands

```bash
# Staging (most common for testing)
cp google-services-staging.json google-services.json && eas build --platform android --profile staging

# Production (for Play Store)
cp google-services-production.json google-services.json && eas build --platform android --profile production
```

## Firebase Projects

- **Development**: `racefy-local-69c59`
- **Staging**: `racefy-stage-e46f7`
- **Production**: `racefy-prod`