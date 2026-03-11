import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  Modal,
  Pressable,
  Text,
  Dimensions,
  PanResponder,
  Platform,
  ActivityIndicator,
} from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";

const SCREEN_W = Dimensions.get("window").width;
const SCREEN_H = Dimensions.get("window").height;
const CROP_BOX = Math.min(SCREEN_W - 48, SCREEN_H * 0.42);

interface Props {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  onCropDone: (croppedUri: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  visible,
  imageUri,
  imageWidth: propW,
  imageHeight: propH,
  onCropDone,
  onCancel,
}: Props) {
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cropping, setCropping] = useState(false);
  const [ready, setReady] = useState(false);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  const posXRef = useRef(0);
  const posYRef = useRef(0);
  const zoomRef = useRef(1);
  const baseW = useRef(0);
  const baseH = useRef(0);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const pinchBaseDist = useRef(0);
  const pinchBaseZoom = useRef(1);

  useEffect(() => {
    if (!visible || !imageUri) {
      setReady(false);
      return;
    }

    const init = (w: number, h: number) => {
      if (!w || !h) return;
      setNatW(w);
      setNatH(h);

      let bw: number, bh: number;
      if (w >= h) {
        bh = CROP_BOX;
        bw = (w / h) * CROP_BOX;
      } else {
        bw = CROP_BOX;
        bh = (h / w) * CROP_BOX;
      }
      baseW.current = bw;
      baseH.current = bh;

      setImgW(bw);
      setImgH(bh);
      setPosX((CROP_BOX - bw) / 2);
      setPosY((CROP_BOX - bh) / 2);
      posXRef.current = (CROP_BOX - bw) / 2;
      posYRef.current = (CROP_BOX - bh) / 2;
      setZoom(1);
      zoomRef.current = 1;
      pinchBaseDist.current = 0;
      pinchBaseZoom.current = 1;
      setReady(true);
    };

    if (propW > 0 && propH > 0) {
      init(propW, propH);
    } else {
      Image.getSize(
        imageUri,
        (w, h) => init(w, h),
        () => init(CROP_BOX, CROP_BOX)
      );
    }
  }, [visible, imageUri, propW, propH]);

  const clamp = useCallback((px: number, py: number, z: number) => {
    const w = baseW.current * z;
    const h = baseH.current * z;
    const minX = CROP_BOX - w;
    const minY = CROP_BOX - h;
    return {
      x: Math.max(minX, Math.min(0, px)),
      y: Math.max(minY, Math.min(0, py)),
    };
  }, []);

  const applyZoom = useCallback((newZoom: number) => {
    const z = Math.max(1, Math.min(5, newZoom));
    const oldZ = zoomRef.current;
    const oldW = baseW.current * oldZ;
    const oldH = baseH.current * oldZ;
    const newW = baseW.current * z;
    const newH = baseH.current * z;

    const centerX = CROP_BOX / 2;
    const centerY = CROP_BOX / 2;
    const imgCenterX = posXRef.current + oldW / 2;
    const imgCenterY = posYRef.current + oldH / 2;

    const newPosX = centerX - (centerX - posXRef.current) * (newW / oldW);
    const newPosY = centerY - (centerY - posYRef.current) * (newH / oldH);

    const clamped = clamp(newPosX, newPosY, z);
    posXRef.current = clamped.x;
    posYRef.current = clamped.y;
    zoomRef.current = z;
    setPosX(clamped.x);
    setPosY(clamped.y);
    setZoom(z);
    setImgW(baseW.current * z);
    setImgH(baseH.current * z);
  }, [clamp]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartX.current = posXRef.current;
        dragStartY.current = posYRef.current;
        pinchBaseDist.current = 0;
        pinchBaseZoom.current = zoomRef.current;
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (pinchBaseDist.current === 0) {
            pinchBaseDist.current = dist;
            return;
          }
          const ratio = dist / pinchBaseDist.current;
          const newZ = Math.max(1, Math.min(5, pinchBaseZoom.current * ratio));
          const oldZ = zoomRef.current;
          const oldW = baseW.current * oldZ;
          const newW = baseW.current * newZ;
          const oldH = baseH.current * oldZ;
          const newH = baseH.current * newZ;
          const cx = CROP_BOX / 2;
          const cy = CROP_BOX / 2;
          const npx = cx - (cx - posXRef.current) * (newW / oldW);
          const npy = cy - (cy - posYRef.current) * (newH / oldH);
          const c = clamp(npx, npy, newZ);
          posXRef.current = c.x;
          posYRef.current = c.y;
          zoomRef.current = newZ;
          setPosX(c.x);
          setPosY(c.y);
          setZoom(newZ);
          setImgW(baseW.current * newZ);
          setImgH(baseH.current * newZ);
        } else {
          const nx = dragStartX.current + gs.dx;
          const ny = dragStartY.current + gs.dy;
          const c = clamp(nx, ny, zoomRef.current);
          posXRef.current = c.x;
          posYRef.current = c.y;
          setPosX(c.x);
          setPosY(c.y);
        }
      },
      onPanResponderRelease: () => {
        pinchBaseDist.current = 0;
      },
    })
  ).current;

  const handleWheel = useCallback(
    (e: any) => {
      e.preventDefault?.();
      const delta = e.deltaY || e.nativeEvent?.deltaY || 0;
      const factor = delta > 0 ? 0.95 : 1.05;
      applyZoom(zoomRef.current * factor);
    },
    [applyZoom]
  );

  const confirmCrop = useCallback(async () => {
    if (!imageUri || !natW || !natH) return;
    setCropping(true);
    try {
      const currentW = baseW.current * zoomRef.current;
      const currentH = baseH.current * zoomRef.current;
      const px = posXRef.current;
      const py = posYRef.current;

      const visibleLeft = -px;
      const visibleTop = -py;

      const scaleToNat = natW / currentW;

      let originX = Math.round(visibleLeft * scaleToNat);
      let originY = Math.round(visibleTop * scaleToNat);
      let cropSize = Math.round(CROP_BOX * scaleToNat);

      originX = Math.max(0, Math.min(originX, natW - 1));
      originY = Math.max(0, Math.min(originY, natH - 1));
      cropSize = Math.min(cropSize, natW - originX, natH - originY);
      cropSize = Math.max(1, cropSize);

      const result = await manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropSize, height: cropSize } }],
        { compress: 0.85, format: SaveFormat.JPEG, base64: true }
      );

      if (result.base64) {
        onCropDone(`data:image/jpeg;base64,${result.base64}`);
      } else if (result.uri) {
        onCropDone(result.uri);
      } else {
        throw new Error("manipulateAsync returned no image data");
      }
    } catch (err: any) {
      console.error("Crop error:", err);
      const { Alert } = require("react-native");
      Alert.alert("Crop Failed", err?.message || "Unknown crop error");
    } finally {
      setCropping(false);
    }
  }, [imageUri, natW, natH, onCropDone]);

  if (!visible || !imageUri) return null;

  if (!ready) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={[st.container, { justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 16, fontFamily: "Inter_400Regular" }}>
            Loading image...
          </Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.container}>
        <View style={st.header}>
          <Pressable style={st.headerBtn} onPress={onCancel}>
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
          <Text style={st.headerTitle}>Crop Photo</Text>
          <View style={st.headerBtn} />
        </View>

        <Text style={st.hint}>
          Drag to move{Platform.OS === "web" ? ", scroll to zoom" : ", pinch to zoom"}
        </Text>

        <View style={st.cropArea}>
          <View
            style={st.imageContainer}
            {...panResponder.panHandlers}
            {...(Platform.OS === "web" ? { onWheel: handleWheel } : {})}
          >
            <Image
              source={{ uri: imageUri }}
              style={{
                position: "absolute",
                left: posX,
                top: posY,
                width: imgW,
                height: imgH,
              }}
              resizeMode="cover"
            />
          </View>

          <View style={st.overlayTop} pointerEvents="none" />
          <View style={st.overlayBottom} pointerEvents="none" />
          <View style={st.overlayLeft} pointerEvents="none" />
          <View style={st.overlayRight} pointerEvents="none" />

          <View style={st.cropFrame} pointerEvents="none">
            <View style={[st.corner, st.cornerTL]} />
            <View style={[st.corner, st.cornerTR]} />
            <View style={[st.corner, st.cornerBL]} />
            <View style={[st.corner, st.cornerBR]} />
            <View style={st.gridH1} />
            <View style={st.gridH2} />
            <View style={st.gridV1} />
            <View style={st.gridV2} />
          </View>
        </View>

        <View style={st.zoomRow}>
          <Pressable style={st.zoomBtn} onPress={() => applyZoom(zoomRef.current * 0.8)}>
            <Ionicons name="remove" size={20} color="#FFF" />
          </Pressable>
          <Text style={st.zoomText}>{Math.round(zoom * 100)}%</Text>
          <Pressable style={st.zoomBtn} onPress={() => applyZoom(zoomRef.current * 1.25)}>
            <Ionicons name="add" size={20} color="#FFF" />
          </Pressable>
        </View>

        <View style={st.footer}>
          <Pressable style={st.cancelBtn} onPress={onCancel}>
            <Text style={st.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[st.confirmBtn, cropping && { opacity: 0.6 }]}
            onPress={confirmCrop}
            disabled={cropping}
          >
            {cropping ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#FFF" />
            )}
            <Text style={st.confirmBtnText}>{cropping ? "Cropping..." : "Confirm"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const OVERLAY_COLOR = "rgba(0,0,0,0.6)";
const AREA_H = CROP_BOX + 80;
const OVERLAY_V = (AREA_H - CROP_BOX) / 2;
const OVERLAY_H = 24;

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 16 : 54,
    paddingBottom: 12,
    zIndex: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  hint: {
    position: "absolute",
    top: Platform.OS === "web" ? 70 : 108,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    zIndex: 20,
  },
  cropArea: {
    width: CROP_BOX + OVERLAY_H * 2,
    height: AREA_H,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageContainer: {
    width: CROP_BOX,
    height: CROP_BOX,
    overflow: "hidden",
    zIndex: 1,
  },
  overlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: OVERLAY_V,
    backgroundColor: OVERLAY_COLOR,
    zIndex: 2,
  },
  overlayBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: OVERLAY_V,
    backgroundColor: OVERLAY_COLOR,
    zIndex: 2,
  },
  overlayLeft: {
    position: "absolute",
    top: OVERLAY_V,
    left: 0,
    width: OVERLAY_H,
    height: CROP_BOX,
    backgroundColor: OVERLAY_COLOR,
    zIndex: 2,
  },
  overlayRight: {
    position: "absolute",
    top: OVERLAY_V,
    right: 0,
    width: OVERLAY_H,
    height: CROP_BOX,
    backgroundColor: OVERLAY_COLOR,
    zIndex: 2,
  },
  cropFrame: {
    position: "absolute",
    top: OVERLAY_V,
    left: OVERLAY_H,
    width: CROP_BOX,
    height: CROP_BOX,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 4,
    zIndex: 10,
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#FFF",
    zIndex: 11,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },
  gridH1: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "33.33%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  gridH2: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "66.66%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  gridV1: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "33.33%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  gridV2: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "66.66%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  zoomRow: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 90 : 108,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 20,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    minWidth: 44,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "web" ? 24 : 42,
    paddingTop: 16,
    zIndex: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
});
