#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler2D u_curveLUT;

// Basic adjustments
uniform float u_exposure;      // EV: -5 to +5
uniform float u_temperature;   // -100 to +100
uniform float u_tint;          // -100 to +100
uniform float u_contrast;      // -100 to +100
uniform float u_highlights;    // -100 to +100
uniform float u_shadows;       // -100 to +100
uniform float u_whites;        // -100 to +100
uniform float u_blacks;        // -100 to +100
uniform float u_saturation;    // -100 to +100
uniform float u_vibrance;      // -100 to +100

// Image dimensions for sharpening
uniform vec2 u_texelSize;      // 1.0 / image dimensions
uniform float u_sharpness;     // 0 to 100

// sRGB <-> Linear conversions
vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linearToSrgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// Luminance (Rec. 709)
float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Apply exposure in linear light
vec3 applyExposure(vec3 c, float ev) {
    return c * pow(2.0, ev);
}

// White balance: shift color temperature and tint
vec3 applyWhiteBalance(vec3 c, float temp, float tint_v) {
    // Temperature: warm (positive) increases R, decreases B
    float t = temp / 100.0;
    float ti = tint_v / 100.0;
    c.r *= 1.0 + t * 0.3;
    c.b *= 1.0 - t * 0.3;
    // Tint: shift green-magenta
    c.g *= 1.0 + ti * 0.2;
    return c;
}

// S-curve contrast
vec3 applyContrast(vec3 c, float amount) {
    float t = amount / 100.0;
    // Apply S-curve with adjustable strength
    vec3 midpoint = vec3(0.5);
    return midpoint + (c - midpoint) * (1.0 + t);
}

// Highlights recovery
vec3 applyHighlights(vec3 c, float amount) {
    float t = amount / 100.0;
    float lum = luminance(c);
    // Affect bright regions more
    float mask = smoothstep(0.5, 1.0, lum);
    return c + (c - c * mask) * t * mask * -1.0;
}

// Shadows lift
vec3 applyShadows(vec3 c, float amount) {
    float t = amount / 100.0;
    float lum = luminance(c);
    // Affect dark regions more
    float mask = 1.0 - smoothstep(0.0, 0.5, lum);
    return c + vec3(mask * t * 0.3);
}

// Whites adjustment
vec3 applyWhites(vec3 c, float amount) {
    float t = amount / 100.0;
    float lum = luminance(c);
    float mask = smoothstep(0.7, 1.0, lum);
    return c + vec3(mask * t * 0.2);
}

// Blacks adjustment
vec3 applyBlacks(vec3 c, float amount) {
    float t = amount / 100.0;
    float lum = luminance(c);
    float mask = 1.0 - smoothstep(0.0, 0.3, lum);
    return c + vec3(mask * t * 0.2);
}

// Saturation (uniform boost)
vec3 applySaturation(vec3 c, float amount) {
    float t = 1.0 + amount / 100.0;
    float lum = luminance(c);
    return mix(vec3(lum), c, t);
}

// Vibrance (boost low-saturation colors more)
vec3 applyVibrance(vec3 c, float amount) {
    float t = amount / 100.0;
    float lum = luminance(c);
    float sat = length(c - vec3(lum));
    // Lower saturation pixels get more boost
    float boost = 1.0 + t * (1.0 - sat * 2.0);
    boost = max(boost, 0.5);
    return mix(vec3(lum), c, boost);
}

// Unsharp mask sharpening
vec3 applySharpen(vec3 c, vec2 texCoord, float amount) {
    if (amount < 0.5) return c;
    float strength = amount / 100.0 * 2.0;

    // 3x3 box blur as approximation
    vec3 blur = vec3(0.0);
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            blur += texture(u_image, texCoord + vec2(float(x), float(y)) * u_texelSize).rgb;
        }
    }
    blur /= 9.0;

    // Unsharp mask: original + (original - blur) * strength
    return c + (c - blur) * strength;
}

// Apply tone curve via LUT texture
vec3 applyToneCurve(vec3 c, sampler2D lut) {
    // LUT is 256x4 texture: row 0=RGB, row 1=R, row 2=G, row 3=B
    float r = texture(lut, vec2(c.r, 0.125)).r;  // y=0.5/4
    float g = texture(lut, vec2(c.g, 0.375)).g;  // y=1.5/4
    float b = texture(lut, vec2(c.b, 0.625)).b;  // y=2.5/4

    // Apply combined RGB curve
    r = texture(lut, vec2(r, 0.875)).r;  // y=3.5/4
    g = texture(lut, vec2(g, 0.875)).g;
    b = texture(lut, vec2(b, 0.875)).b;

    return vec3(r, g, b);
}

void main() {
    vec3 color = texture(u_image, vTexCoord).rgb;

    // Convert 16-bit linear data to working space
    // (libraw outputs linear light when no gamma is applied)

    // 1. Exposure (in linear light)
    color = applyExposure(color, u_exposure);

    // 2. White balance
    color = applyWhiteBalance(color, u_temperature, u_tint);

    // Clamp to avoid negative values before gamma
    color = max(color, vec3(0.0));

    // Convert to perceptual space for remaining adjustments
    color = linearToSrgb(color);

    // 3. Contrast
    if (abs(u_contrast) > 0.5) {
        color = applyContrast(color, u_contrast);
    }

    // 4. Highlights
    if (abs(u_highlights) > 0.5) {
        color = applyHighlights(color, u_highlights);
    }

    // 5. Shadows
    if (abs(u_shadows) > 0.5) {
        color = applyShadows(color, u_shadows);
    }

    // 6. Whites
    if (abs(u_whites) > 0.5) {
        color = applyWhites(color, u_whites);
    }

    // 7. Blacks
    if (abs(u_blacks) > 0.5) {
        color = applyBlacks(color, u_blacks);
    }

    // 8. Tone curve
    color = clamp(color, 0.0, 1.0);
    color = applyToneCurve(color, u_curveLUT);

    // 9. Saturation
    if (abs(u_saturation) > 0.5) {
        color = applySaturation(color, u_saturation);
    }

    // 10. Vibrance
    if (abs(u_vibrance) > 0.5) {
        color = applyVibrance(color, u_vibrance);
    }

    // 11. Sharpening
    color = applySharpen(color, vTexCoord, u_sharpness);

    // Final clamp
    color = clamp(color, 0.0, 1.0);

    fragColor = vec4(color, 1.0);
}
