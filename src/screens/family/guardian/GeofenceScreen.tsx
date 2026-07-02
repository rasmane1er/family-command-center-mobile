import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGuardianStore } from "../../../store/useGuardianStore";
import { useFamilyStore } from "../../../store/useFamilyStore";
import { colors } from "../../../theme/colors";
import { shadows } from "../../../theme/spacing";
import { CollapsibleHeader } from "../../../components/common/CollapsibleHeader";
import type { GeofenceAction, GeofenceZone } from "../../../types";

const ACTION_OPTIONS: { value: GeofenceAction; label: string }[] = [
  { value: "alert_entry", label: "Alert on Entry" },
  { value: "alert_exit", label: "Alert on Exit" },
  { value: "alert_both", label: "Alert on Both" },
];

const ZONE_COLORS = [
  "#E74C3C",
  "#2980B9",
  "#27AE60",
  "#F39C12",
  "#8E44AD",
  "#00BCD4",
  "#FF6B6B",
];

const ZONE_ICONS = [
  "home",
  "school",
  "storefront",
  "fitness",
  "library",
  "location",
  "star",
];

function RadiusLabel({ radius }: { radius: number }) {
  return radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`;
}

const RADIUS_STEPS = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];

export function GeofenceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const zones = useGuardianStore((s) => s.geofenceZones);
  const addGeofenceZone = useGuardianStore((s) => s.addGeofenceZone);
  const updateGeofenceZone = useGuardianStore((s) => s.updateGeofenceZone);
  const removeGeofenceZone = useGuardianStore((s) => s.removeGeofenceZone);
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [radiusIdx, setRadiusIdx] = useState(3); // 500m default
  const [action, setAction] = useState<GeofenceAction>("alert_both");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0]);
  const [zoneIcon, setZoneIcon] = useState(ZONE_ICONS[0]);

  const childMembers = members.filter((m) => m.role === "child");

  const resetForm = () => {
    setName("");
    setLatStr("");
    setLngStr("");
    setRadiusIdx(3);
    setAction("alert_both");
    setSelectedMembers([]);
    setZoneColor(ZONE_COLORS[0]);
    setZoneIcon(ZONE_ICONS[0]);
  };

  const handleAdd = () => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter a zone name.");
      return;
    }
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Validation", "Please enter valid latitude and longitude.");
      return;
    }
    const zone: GeofenceZone = {
      id: `geo-${Date.now()}`,
      familyId: family?.id ?? "demo-family",
      name: name.trim(),
      lat,
      lng,
      radius: RADIUS_STEPS[radiusIdx],
      action,
      icon: zoneIcon,
      color: zoneColor,
      isActive: true,
      linkedMembers: selectedMembers,
      createdAt: new Date().toISOString(),
    };
    addGeofenceZone(zone);
    resetForm();
    setShowModal(false);
  };

  const handleDelete = (zone: GeofenceZone) => {
    Alert.alert("Delete Zone", `Remove "${zone.name}" geofence?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeGeofenceZone(zone.id),
      },
    ]);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const activeZones = zones.filter((zone) => zone.isActive).length;
  const watchedMembers = new Set(zones.flatMap((zone) => zone.linkedMembers))
    .size;

  const openAddZoneModal = () => {
    resetForm();
    setShowModal(true);
  };

  const screenHeader = (
    <LinearGradient
      colors={["#0F2952", "#163D73", "#1E4A8A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerEyebrow}>Family Guardian</Text>
          <Text style={styles.headerTitle}>Geofence Zones</Text>
          <Text style={styles.headerSubtitle}>
            Monitor safe places and movement alerts
          </Text>
        </View>

        <Pressable onPress={openAddZoneModal} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.headerStatsCard}>
        <View style={styles.headerStatItem}>
          <Text style={styles.headerStatValue}>{zones.length}</Text>
          <Text style={styles.headerStatLabel}>Zones</Text>
        </View>
        <View style={styles.headerStatDivider} />
        <View style={styles.headerStatItem}>
          <Text style={styles.headerStatValue}>{activeZones}</Text>
          <Text style={styles.headerStatLabel}>Active</Text>
        </View>
        <View style={styles.headerStatDivider} />
        <View style={styles.headerStatItem}>
          <Text style={styles.headerStatValue}>{watchedMembers}</Text>
          <Text style={styles.headerStatLabel}>Watched</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={["#0F2952", "#1E4A8A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.compactBackBtn}
      >
        <Ionicons name="arrow-back" size={21} color="#fff" />
      </Pressable>

      <Text style={styles.compactTitle}>Geofence Zones</Text>

      <Pressable onPress={openAddZoneModal} style={styles.compactAddBtn}>
        <Ionicons name="add" size={21} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <CollapsibleHeader
        fullHeader={screenHeader}
        compactHeader={screenCompact}
      >
        {({
          onScroll,
          onScrollEndDrag,
          onMomentumScrollEnd,
          scrollEventThrottle,
          contentPaddingTop,
        }) => (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: contentPaddingTop,
                paddingBottom: 100,
              },
            ]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
            {zones.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="location-outline"
                  size={64}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyTitle}>No geofence zones</Text>
                <Text style={styles.emptyDesc}>
                  Tap + to create a zone and get notified when your child enters
                  or leaves
                </Text>
              </View>
            )}

            {zones.map((zone) => (
              <View key={zone.id} style={[styles.zoneCard, shadows.card]}>
                <View style={styles.zoneCardHeader}>
                  <View
                    style={[
                      styles.zoneIcon,
                      { backgroundColor: zone.color + "22" },
                    ]}
                  >
                    <Ionicons
                      name={zone.icon as any}
                      size={22}
                      color={zone.color}
                    />
                  </View>

                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneMeta}>
                      {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} ·{" "}
                      <RadiusLabel radius={zone.radius} />
                    </Text>
                    <Text style={styles.zoneAction}>
                      {ACTION_OPTIONS.find((a) => a.value === zone.action)
                        ?.label ?? zone.action}
                    </Text>
                    {zone.linkedMembers.length > 0 && (
                      <Text style={styles.zoneMembers}>
                        Watching:{" "}
                        {zone.linkedMembers
                          .map(
                            (id) =>
                              members.find((m) => m.id === id)?.name ?? id,
                          )
                          .join(", ")}
                      </Text>
                    )}
                  </View>

                  <View style={styles.zoneRight}>
                    <Switch
                      value={zone.isActive}
                      onValueChange={(val) =>
                        updateGeofenceZone(zone.id, { isActive: val })
                      }
                      trackColor={{ false: colors.border, true: zone.color }}
                      thumbColor="#fff"
                    />
                    <Pressable
                      onPress={() => handleDelete(zone)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <ScrollView
          style={styles.modal}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Geofence Zone</Text>

          <Text style={styles.fieldLabel}>Zone Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Home, School, Park"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Latitude *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 37.7749"
            value={latStr}
            onChangeText={setLatStr}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Longitude *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. -122.4194"
            value={lngStr}
            onChangeText={setLngStr}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>
            Radius: <RadiusLabel radius={RADIUS_STEPS[radiusIdx]} />
          </Text>
          <View style={styles.radiusRow}>
            <Pressable
              onPress={() => setRadiusIdx((i) => Math.max(0, i - 1))}
              style={styles.radiusBtn}
            >
              <Ionicons name="remove" size={20} color={colors.primary} />
            </Pressable>
            <View style={styles.radiusBarOuter}>
              <View
                style={[
                  styles.radiusBarFill,
                  {
                    width: `${((radiusIdx + 1) / RADIUS_STEPS.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Pressable
              onPress={() =>
                setRadiusIdx((i) => Math.min(RADIUS_STEPS.length - 1, i + 1))
              }
              style={styles.radiusBtn}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Alert Trigger</Text>
          <View style={styles.optionRow}>
            {ACTION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setAction(opt.value)}
                style={[
                  styles.optionChip,
                  action === opt.value && styles.optionChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    action === opt.value && styles.optionChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {ZONE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setZoneColor(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  zoneColor === c && styles.colorSwatchSelected,
                ]}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconRow}>
            {ZONE_ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => setZoneIcon(ic)}
                style={[
                  styles.iconSwatch,
                  zoneIcon === ic && { backgroundColor: zoneColor + "33" },
                ]}
              >
                <Ionicons
                  name={ic as any}
                  size={22}
                  color={zoneIcon === ic ? zoneColor : colors.textMuted}
                />
              </Pressable>
            ))}
          </View>

          {childMembers.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Watch Members</Text>
              <View style={styles.memberChips}>
                {childMembers.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => toggleMember(m.id)}
                    style={[
                      styles.memberChip,
                      selectedMembers.includes(m.id) && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        selectedMembers.includes(m.id) && { color: "#fff" },
                      ]}
                    >
                      {m.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable style={styles.saveBtn} onPress={handleAdd}>
            <Text style={styles.saveBtnText}>Add Zone</Text>
          </Pressable>

          <Pressable
            style={styles.cancelBtn}
            onPress={() => setShowModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  headerTextBlock: {
    flex: 1,
  },

  headerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.62)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.68)",
    marginTop: 3,
  },

  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  headerStatsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  headerStatItem: {
    flex: 1,
    alignItems: "center",
  },

  headerStatValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },

  headerStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.62)",
    marginTop: 2,
  },

  headerStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  compactHeader: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  compactBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  compactTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  compactAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  content: { padding: 16 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
  },

  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },

  zoneCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  zoneCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  zoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  zoneInfo: { flex: 1 },

  zoneName: { fontSize: 16, fontWeight: "700", color: colors.text },

  zoneMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  zoneAction: {
    fontSize: 12,
    color: colors.info,
    marginTop: 2,
    fontWeight: "600",
  },

  zoneMembers: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  zoneRight: { alignItems: "center", gap: 8 },

  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  modal: { flex: 1, padding: 24, backgroundColor: colors.background },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 20,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 16,
  },

  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  radiusBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radiusBarOuter: {
    flex: 1,
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: "hidden",
  },

  radiusBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 5,
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  optionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  optionChipTextActive: { color: "#fff" },

  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },

  colorSwatch: { width: 32, height: 32, borderRadius: 16 },

  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },

  iconRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },

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

  memberChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  memberChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  memberChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },

  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  cancelBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
