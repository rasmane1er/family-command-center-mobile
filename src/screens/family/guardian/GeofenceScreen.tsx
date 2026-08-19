import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useGuardianStore } from "../../../store/useGuardianStore";
import { useFamilyStore } from "../../../store/useFamilyStore";
import { colors } from "../../../theme/colors";
import { shadows } from "../../../theme/spacing";
import type { GeofenceAction, GeofenceZone } from "../../../types";
import { Avatar } from "../../../components/common/Avatar";

const ZONE_COLORS = [
  "#E74C3C",
  "#2980B9",
  "#27AE60",
  "#F39C12",
  "#8E44AD",
  "#00BCD4",
  "#FF6B6B",
  "#4A7C59",
];

const ZONE_ICONS = [
  "home",
  "school",
  "storefront",
  "fitness",
  "library",
  "location",
  "star",
  "shield",
];

function RadiusLabel({ radius }: { radius: number }) {
  return <>{radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${Math.round(radius)} m`}</>;
}

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface DraftZone {
  lat: number;
  lng: number;
  radius: number;
  name: string;
  action: GeofenceAction;
  color: string;
  icon: string;
  linkedMembers: string[];
}

const ACTION_OPTIONS: { value: GeofenceAction; labelKey: string }[] = [
  { value: "alert_entry", labelKey: "actionAlertEntry" },
  { value: "alert_exit", labelKey: "actionAlertExit" },
  { value: "alert_both", labelKey: "actionAlertBoth" },
];

export function GeofenceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('family');
  const mapRef = useRef<MapView>(null);

  const zones = useGuardianStore((s) => s.geofenceZones);
  const addGeofenceZone = useGuardianStore((s) => s.addGeofenceZone);
  const updateGeofenceZone = useGuardianStore((s) => s.updateGeofenceZone);
  const removeGeofenceZone = useGuardianStore((s) => s.removeGeofenceZone);
  const devices = useGuardianStore((s) => s.devices);
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const [draftZone, setDraftZone] = useState<DraftZone | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [showZonesList, setShowZonesList] = useState(false);
  const [locating, setLocating] = useState(false);

  const childMembers = members.filter((m) => m.role === "child");

  const childMarkers = useMemo(() => {
    // Re-pairing a child device (re-scanning the QR code, reinstalling, etc.)
    // has been creating a NEW ChildDevice row instead of reusing the existing
    // one for that member, so a member with 3 historical pairings shows up as
    // 3 overlapping map markers. Dedupe to one marker per member — whichever
    // device most recently reported in — until the pairing flow itself stops
    // creating duplicates server-side.
    const latestByMember = new Map<string, (typeof devices)[number]>();
    for (const d of devices) {
      const existing = latestByMember.get(d.memberId);
      if (!existing || new Date(d.lastSeen).getTime() > new Date(existing.lastSeen).getTime()) {
        latestByMember.set(d.memberId, d);
      }
    }
    return Array.from(latestByMember.values())
      .map((d) => {
        const loc = d.location ?? (d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null);
        if (!loc) return null;
        const member = members.find((m) => m.id === d.memberId);
        const address = d.location?.address ?? d.address ?? null;
        return { deviceId: d.id, lat: loc.lat, lng: loc.lng, member, address };
      })
      .filter((x): x is { deviceId: string; lat: number; lng: number; member: (typeof members)[number] | undefined; address: string | null } => x !== null);
  }, [devices, members]);

  // The backend's `address` field is only ever populated if the child app
  // sends one (it never does — no reverse-geocoding exists there), so it's
  // always empty in practice. Resolve it client-side instead: cheap, works
  // immediately without touching the child app or backend, and only re-runs
  // per device when its rounded position actually changes.
  const [resolvedAddresses, setResolvedAddresses] = useState<Record<string, string>>({});
  const geocodedPositionRef = useRef<Record<string, string>>({});

  useEffect(() => {
    childMarkers.forEach(({ deviceId, lat, lng, address }) => {
      if (address) return;
      const posKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (geocodedPositionRef.current[deviceId] === posKey) return;
      geocodedPositionRef.current[deviceId] = posKey;
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        .then((results) => {
          const r = results[0];
          if (!r) return;
          // r.street is just the road name — the house number is a separate
          // streetNumber field, so without it every address was missing its
          // number (e.g. "Woodlands Green Rd" instead of "7005 Woodlands
          // Green Rd").
          const streetLine = [r.streetNumber, r.street ?? r.name].filter(Boolean).join(" ");
          const formatted = [streetLine, r.city].filter(Boolean).join(", ");
          if (formatted) {
            setResolvedAddresses((prev) => ({ ...prev, [deviceId]: formatted }));
          }
        })
        .catch(() => { /* offline or rate-limited — leave blank */ });
    });
  }, [childMarkers]);

  const initialRegion = useMemo<Region>(() => {
    const points = [
      ...childMarkers.map((c) => ({ latitude: c.lat, longitude: c.lng })),
      ...zones.map((z) => ({ latitude: z.lat, longitude: z.lng })),
    ];
    if (points.length === 0) return DEFAULT_REGION;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.8),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.8),
    };
    // Intentionally computed once for the initial mount only — MapView's
    // initialRegion isn't meant to be kept in sync after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewZone = (preset?: "dutyStation") => {
    const center = childMarkers[0]
      ? { lat: childMarkers[0].lat, lng: childMarkers[0].lng }
      : { lat: initialRegion.latitude, lng: initialRegion.longitude };
    setEditingZoneId(null);
    setShowZonesList(false);
    setDraftZone({
      lat: center.lat,
      lng: center.lng,
      // Duty stations / installations are much larger than a home or
      // school zone, so the preset starts with a bigger radius instead of
      // making the user drag the slider every time.
      radius: preset === "dutyStation" ? 2000 : 500,
      name: preset === "dutyStation" ? "Duty Station" : "",
      action: "alert_both",
      color: preset === "dutyStation" ? "#4A7C59" : ZONE_COLORS[0],
      icon: preset === "dutyStation" ? "shield" : ZONE_ICONS[0],
      linkedMembers: [],
    });
  };

  const startEditZone = (zone: GeofenceZone) => {
    setEditingZoneId(zone.id);
    setShowZonesList(false);
    setDraftZone({
      lat: zone.lat,
      lng: zone.lng,
      radius: zone.radius,
      name: zone.name,
      action: zone.action,
      color: zone.color,
      icon: zone.icon,
      linkedMembers: [...zone.linkedMembers],
    });
  };

  const cancelDraft = () => {
    setDraftZone(null);
    setEditingZoneId(null);
  };

  const saveDraft = () => {
    if (!draftZone) return;
    if (!draftZone.name.trim()) {
      Alert.alert(t('common.validationTitle'), t('common.validationMsg'));
      return;
    }

    if (editingZoneId) {
      updateGeofenceZone(editingZoneId, {
        name: draftZone.name.trim(),
        lat: draftZone.lat,
        lng: draftZone.lng,
        radius: draftZone.radius,
        action: draftZone.action,
        color: draftZone.color,
        icon: draftZone.icon,
        linkedMembers: draftZone.linkedMembers,
      });
    } else {
      const zone: GeofenceZone = {
        id: `geo-${Date.now()}`,
        familyId: useAuthStore.getState().familyId ?? family?.id ?? "",
        name: draftZone.name.trim(),
        lat: draftZone.lat,
        lng: draftZone.lng,
        radius: draftZone.radius,
        action: draftZone.action,
        icon: draftZone.icon,
        color: draftZone.color,
        isActive: true,
        linkedMembers: draftZone.linkedMembers,
        createdAt: new Date().toISOString(),
      };
      addGeofenceZone(zone);
    }
    cancelDraft();
  };

  const handleDelete = (zone: GeofenceZone) => {
    Alert.alert(t('common.deleteTitle'), `Remove "${zone.name}" geofence?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeGeofenceZone(zone.id);
          cancelDraft();
        },
      },
    ]);
  };

  const toggleMember = (memberId: string) => {
    if (!draftZone) return;
    setDraftZone({
      ...draftZone,
      linkedMembers: draftZone.linkedMembers.includes(memberId)
        ? draftZone.linkedMembers.filter((id) => id !== memberId)
        : [...draftZone.linkedMembers, memberId],
    });
  };

  const useMyLocation = async () => {
    if (!draftZone) return;
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Enable location access to center a zone on your current position — or drag the pin on the map instead.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const next = { ...draftZone, lat: pos.coords.latitude, lng: pos.coords.longitude };
      setDraftZone(next);
      mapRef.current?.animateToRegion(
        { latitude: next.lat, longitude: next.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
    } catch {
      Alert.alert(t('common.error'), t('common.errorLocation'));
    } finally {
      setLocating(false);
    }
  };

  const flyToZone = (zone: GeofenceZone) => {
    setShowZonesList(false);
    mapRef.current?.animateToRegion(
      { latitude: zone.lat, longitude: zone.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  };

  const activeZones = zones.filter((zone) => zone.isActive).length;

  return (
    <View style={styles.container}>
      {/* Explicit Google Maps on both platforms — without this, iOS quietly
          falls back to Apple Maps (no key needed) while Android renders a
          blank map without a Google Maps API key configured in app.json,
          so the two platforms looked and behaved differently. */}
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {zones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={{ latitude: zone.lat, longitude: zone.lng }}
              radius={zone.radius}
              strokeColor={zone.color}
              fillColor={zone.color + "22"}
              strokeWidth={2}
            />
            <Marker coordinate={{ latitude: zone.lat, longitude: zone.lng }} onPress={() => startEditZone(zone)}>
              <View style={[styles.zoneMarker, { backgroundColor: zone.color }]}>
                <Ionicons name={zone.icon as any} size={16} color="#fff" />
              </View>
            </Marker>
          </React.Fragment>
        ))}

        {childMarkers.map(({ deviceId, lat, lng, member, address }) => {
          const displayAddress = address ?? resolvedAddresses[deviceId];
          return (
            <Marker key={deviceId} coordinate={{ latitude: lat, longitude: lng }} zIndex={10}>
              <View style={[styles.childMarkerRing, { borderColor: member?.avatarColor ?? colors.primary }]}>
                <Avatar name={member?.name ?? "?"} color={member?.avatarColor} imageUri={member?.avatar} size={40} />
              </View>
              <View style={styles.childMarkerLabelWrap}>
                <Text style={styles.childMarkerLabel}>{member?.name ?? "Unknown"}</Text>
                {displayAddress && (
                  <Text style={styles.childMarkerAddress} numberOfLines={1}>
                    {displayAddress}
                  </Text>
                )}
              </View>
            </Marker>
          );
        })}

        {draftZone && (
          <>
            <Circle
              center={{ latitude: draftZone.lat, longitude: draftZone.lng }}
              radius={draftZone.radius}
              strokeColor={draftZone.color}
              fillColor={draftZone.color + "33"}
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: draftZone.lat, longitude: draftZone.lng }}
              draggable
              zIndex={20}
              onDragEnd={(e) =>
                setDraftZone((prev) =>
                  prev
                    ? { ...prev, lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }
                    : prev,
                )
              }
            >
              <View style={[styles.zoneMarker, styles.zoneMarkerDraft, { backgroundColor: draftZone.color }]}>
                <Ionicons name={draftZone.icon as any} size={16} color="#fff" />
              </View>
            </Marker>
          </>
        )}
      </MapView>

      {/* Floating header — a CollapsibleHeader doesn't fit a full-map layout
          (nothing scrolls behind the map), so this is a simple overlay
          instead, matching the standard map-app pattern. */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={[styles.floatingBtn, shadows.card]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={[styles.headerStatsPill, shadows.card]}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={styles.headerStatsText}>
            {zones.length} zone{zones.length === 1 ? "" : "s"} · {activeZones} active
          </Text>
        </View>
        <Pressable accessibilityRole="button"
          onPress={() => setShowZonesList((v) => !v)}
          style={[styles.floatingBtn, shadows.card, showZonesList && styles.floatingBtnActive]}
        >
          <Ionicons name="list" size={20} color={showZonesList ? "#fff" : colors.text} />
        </Pressable>
      </View>

      {!draftZone && (
        <>
          <Pressable accessibilityRole="button" style={[styles.fab, { bottom: insets.bottom + 24 }, shadows.card]} onPress={() => startNewZone()}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
          <Pressable accessibilityRole="button"
            style={[styles.fabSecondary, { bottom: insets.bottom + 90 }, shadows.card]}
            onPress={() => startNewZone("dutyStation")}
          >
            <Ionicons name="shield" size={20} color="#fff" />
          </Pressable>
        </>
      )}

      {showZonesList && !draftZone && (
        <View style={[styles.zonesSheet, { paddingBottom: insets.bottom + 16 }, shadows.card]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Geofence Zones</Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {zones.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No geofence zones</Text>
                <Text style={styles.emptyDesc}>Tap + to draw a zone on the map</Text>
              </View>
            )}

            {zones.map((zone) => (
              <Pressable accessibilityRole="button" key={zone.id} style={styles.zoneCard} onPress={() => flyToZone(zone)}>
                <View style={[styles.zoneIcon, { backgroundColor: zone.color + "22" }]}>
                  <Ionicons name={zone.icon as any} size={22} color={zone.color} />
                </View>

                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneMeta}>
                    <RadiusLabel radius={zone.radius} /> ·{" "}
                    {(() => {
                      const opt = ACTION_OPTIONS.find((a) => a.value === zone.action);
                      return opt ? t(`family.screens.geofence.${opt.labelKey}`) : zone.action;
                    })()}
                  </Text>
                  {zone.linkedMembers.length > 0 && (
                    <Text style={styles.zoneMembers}>
                      Watching: {zone.linkedMembers.map((id) => members.find((m) => m.id === id)?.name ?? id).join(", ")}
                    </Text>
                  )}
                </View>

                <View style={styles.zoneRight}>
                  <Switch
                    value={zone.isActive}
                    onValueChange={(val) => updateGeofenceZone(zone.id, { isActive: val })}
                    trackColor={{ false: colors.border, true: zone.color }}
                    thumbColor="#fff"
                  />
                  <Pressable accessibilityRole="button" onPress={() => startEditZone(zone)} style={styles.editBtn}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => handleDelete(zone)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {draftZone && (
        <View style={[styles.draftPanel, { paddingBottom: insets.bottom + 16 }, shadows.card]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editingZoneId ? "Edit Zone" : "New Zone"}</Text>

            <TextInput accessibilityLabel="Zone name (e.g. Home, School, Park)"
              style={styles.input}
              placeholder="Zone name (e.g. Home, School, Park)"
              value={draftZone.name}
              onChangeText={(t) => setDraftZone({ ...draftZone, name: t })}
              placeholderTextColor={colors.textMuted}
            />

            <Pressable accessibilityRole="button" style={styles.locateBtn} onPress={useMyLocation} disabled={locating}>
              <Ionicons name="locate" size={16} color={colors.primary} />
              <Text style={styles.locateBtnText}>{locating ? "Locating…" : "Use My Current Location"}</Text>
            </Pressable>
            <Text style={styles.hint}>Or drag the pin on the map to position this zone</Text>

            <Text style={styles.fieldLabel}>
              Radius: <RadiusLabel radius={draftZone.radius} />
            </Text>
            <Slider
              style={{ marginBottom: 16 }}
              minimumValue={100}
              maximumValue={5000}
              step={50}
              value={draftZone.radius}
              onValueChange={(v) => setDraftZone({ ...draftZone, radius: v })}
              minimumTrackTintColor={draftZone.color}
              maximumTrackTintColor={colors.border}
              thumbTintColor={draftZone.color}
            />

            <Text style={styles.fieldLabel}>{t('family.screens.geofence.alertTriggerLabel')}</Text>
            <View style={styles.optionRow}>
              {ACTION_OPTIONS.map((opt) => (
                <Pressable accessibilityRole="button"
                  key={opt.value}
                  onPress={() => setDraftZone({ ...draftZone, action: opt.value })}
                  style={[styles.optionChip, draftZone.action === opt.value && styles.optionChipActive]}
                >
                  <Text style={[styles.optionChipText, draftZone.action === opt.value && styles.optionChipTextActive]}>
                    {t(`family.screens.geofence.${opt.labelKey}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {ZONE_COLORS.map((c) => (
                <Pressable accessibilityRole="button"
                  key={c}
                  onPress={() => setDraftZone({ ...draftZone, color: c })}
                  style={[styles.colorSwatch, { backgroundColor: c }, draftZone.color === c && styles.colorSwatchSelected]}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconRow}>
              {ZONE_ICONS.map((ic) => (
                <Pressable accessibilityRole="button"
                  key={ic}
                  onPress={() => setDraftZone({ ...draftZone, icon: ic })}
                  style={[styles.iconSwatch, draftZone.icon === ic && { backgroundColor: draftZone.color + "33" }]}
                >
                  <Ionicons name={ic as any} size={22} color={draftZone.icon === ic ? draftZone.color : colors.textMuted} />
                </Pressable>
              ))}
            </View>

            {childMembers.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Watch Members</Text>
                <View style={styles.memberChips}>
                  {childMembers.map((m) => (
                    <Pressable accessibilityRole="button"
                      key={m.id}
                      onPress={() => toggleMember(m.id)}
                      style={[
                        styles.memberChip,
                        draftZone.linkedMembers.includes(m.id) && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.memberChipText, draftZone.linkedMembers.includes(m.id) && { color: "#fff" }]}>
                        {m.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={saveDraft}>
              <Text style={styles.saveBtnText}>{editingZoneId ? "Save Changes" : "Add Zone"}</Text>
            </Pressable>

            {editingZoneId && (
              <Pressable accessibilityRole="button"
                style={styles.deleteZoneBtn}
                onPress={() => {
                  const zone = zones.find((z) => z.id === editingZoneId);
                  if (zone) handleDelete(zone);
                }}
              >
                <Text style={styles.deleteZoneBtnText}>Delete Zone</Text>
              </Pressable>
            )}

            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={cancelDraft}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },

  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  floatingBtnActive: { backgroundColor: colors.primary },

  headerStatsPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },

  headerStatsText: { fontSize: 12, fontWeight: "700", color: colors.text },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  fabSecondary: {
    position: "absolute",
    right: 26,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4A7C59",
    alignItems: "center",
    justifyContent: "center",
  },

  zoneMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  zoneMarkerDraft: { borderColor: "#fff", borderWidth: 3 },

  childMarkerRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    alignSelf: "center",
  },

  childMarkerLabelWrap: {
    marginTop: 2,
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: "center",
    maxWidth: 140,
  },

  childMarkerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  childMarkerAddress: {
    fontSize: 9,
    fontWeight: "500",
    color: colors.textMuted,
    textAlign: "center",
  },

  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },

  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 16, paddingHorizontal: 20 },

  zonesSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "55%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },

  draftPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "72%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },

  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },

  zoneCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },

  zoneIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 15, fontWeight: "700", color: colors.text },
  zoneMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  zoneMembers: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  zoneRight: { alignItems: "center", gap: 6 },

  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 10,
  },

  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary + "14",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },

  locateBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },

  hint: { fontSize: 11, color: colors.textMuted, textAlign: "center", marginBottom: 16 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },

  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  optionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  optionChipTextActive: { color: "#fff" },

  colorRow: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },

  iconRow: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },

  iconSwatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },

  memberChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  memberChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },

  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 10 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  deleteZoneBtn: {
    backgroundColor: colors.dangerLight,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  deleteZoneBtnText: { fontSize: 15, fontWeight: "700", color: colors.danger },

  cancelBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
});
