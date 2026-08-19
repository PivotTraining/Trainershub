import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { useAvailabilitySlots, useCreateSlot, useDeleteSlot } from '@/lib/queries/availability';
import { normalizeClockTime, validateAvailabilityRange } from '@/lib/scheduling';
import { BRAND, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { AvailabilitySlot, DayOfWeek } from '@/lib/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAYS_ORDERED: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
function formatTime(hhmm: string): string { const [h, m='00'] = hhmm.split(':'); const hour=Number(h); return `${hour%12||12}:${m} ${hour>=12?'PM':'AM'}`; }

function AddSlotModal({ visible, trainerId, existingSlots, onClose }: { visible: boolean; trainerId: string; existingSlots: AvailabilitySlot[]; onClose: () => void }) {
  const { colors, accent } = useTheme();
  const createSlot = useCreateSlot(trainerId);
  const [day, setDay] = useState<DayOfWeek>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const handleAdd = async () => {
    const validation = validateAvailabilityRange(day, startTime, endTime, existingSlots);
    if (!validation.valid) return Alert.alert('Check availability', validation.message);
    const start = normalizeClockTime(startTime); const end = normalizeClockTime(endTime); if (!start || !end) return;
    try { await createSlot.mutateAsync({ day_of_week: day, start_time: start, end_time: end }); onClose(); }
    catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error'); }
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={[styles.modalSafe,{backgroundColor:colors.background}]}><View style={[styles.modalHeader,{borderBottomColor:colors.border}]}><TouchableOpacity onPress={onClose}><Text style={{color:colors.muted}}>Cancel</Text></TouchableOpacity><Text style={[styles.modalTitle,{color:colors.ink}]}>Add availability</Text><TouchableOpacity onPress={handleAdd} disabled={createSlot.isPending}>{createSlot.isPending?<ActivityIndicator/>:<Text style={{color:accent,fontWeight:'900'}}>Add</Text>}</TouchableOpacity></View><ScrollView contentContainerStyle={styles.modalContent}><Text style={[styles.label,{color:colors.muted}]}>DAY</Text><View style={styles.dayRow}>{DAYS_ORDERED.map(d=><TouchableOpacity key={d} style={[styles.dayBtn,{borderColor:day===d?accent:colors.border,backgroundColor:day===d?BRAND.navy:'transparent'}]} onPress={()=>setDay(d)}><View style={[styles.dayRail,{backgroundColor:day===d?accent:colors.border}]}/><Text style={{color:day===d?'#fff':colors.ink,fontWeight:'800'}}>{DAY_NAMES[d]}</Text></TouchableOpacity>)}</View><Text style={[styles.label,{color:colors.muted}]}>START · 24-HOUR TIME</Text><TextInput style={[styles.input,{borderColor:colors.borderInput,color:colors.ink,backgroundColor:colors.surfaceCard}]} value={startTime} onChangeText={setStartTime}/><Text style={[styles.label,{color:colors.muted}]}>END · 24-HOUR TIME</Text><TextInput style={[styles.input,{borderColor:colors.borderInput,color:colors.ink,backgroundColor:colors.surfaceCard}]} value={endTime} onChangeText={setEndTime}/></ScrollView></SafeAreaView></Modal>;
}

function SlotRow({ slot, trainerId }: { slot: AvailabilitySlot; trainerId: string }) {
  const { colors, accent } = useTheme(); const deleteSlot=useDeleteSlot(trainerId);
  const handleDelete=()=>Alert.alert('Remove slot?',undefined,[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{try{await deleteSlot.mutateAsync(slot.id);}catch(e:unknown){Alert.alert('Error',e instanceof Error?e.message:'Unknown error');}}}]);
  return <View style={[styles.slotRow,{borderColor:colors.border,backgroundColor:colors.surfaceCard}]}><View style={[styles.slotRail,{backgroundColor:accent}]}/><Ionicons name="time-outline" size={17} color={accent}/><Text style={[styles.slotTime,{color:colors.ink}]}>{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</Text><TouchableOpacity onPress={handleDelete} disabled={deleteSlot.isPending}>{deleteSlot.isPending?<ActivityIndicator size="small"/>:<Ionicons name="close" size={17} color={colors.danger}/>}</TouchableOpacity></View>;
}

export default function Availability() {
  const { session }=useAuth(); const trainerId=session?.user.id??''; const {colors,accent}=useTheme(); const [showModal,setShowModal]=useState(false); const slotsQuery=useAvailabilitySlots(trainerId); const allSlots=slotsQuery.data??[];
  if(slotsQuery.isLoading)return <View style={[styles.center,{backgroundColor:colors.background}]}><ActivityIndicator/></View>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:colors.background}]} edges={['bottom']}><FlatList data={DAYS_ORDERED} keyExtractor={String} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={slotsQuery.isFetching&&!slotsQuery.isLoading} onRefresh={slotsQuery.refetch}/>} ListHeaderComponent={<><EnergyHero eyebrow="YOUR CALENDAR" title="Availability" subtitle="Open the hours you want clients to be able to request." icon="time-outline" compact/><View style={styles.sectionRow}><Text style={[styles.sectionTitle,{color:colors.ink}]}>Weekly windows</Text><View style={styles.sectionBeam}/></View></>} renderItem={({item:day})=>{const rows=allSlots.filter(s=>s.day_of_week===day);if(!rows.length)return null;return <View style={styles.daySection}><Text style={[styles.dayHeader,{color:accent}]}>{DAY_NAMES[day].toUpperCase()}</Text>{rows.map(slot=><SlotRow key={slot.id} slot={slot} trainerId={trainerId}/>)}</View>;}} ListEmptyComponent={<View style={[styles.empty,{borderColor:colors.border}]}><Ionicons name="time-outline" size={25} color={accent}/><Text style={[styles.emptyTitle,{color:colors.ink}]}>No hours published.</Text><Text style={{color:colors.muted,fontSize:12}}>Add your first availability window to become bookable.</Text></View>}/><TouchableOpacity style={styles.addBtn} onPress={()=>setShowModal(true)}><Ionicons name="add" size={17} color="#fff"/><Text style={styles.addText}>Add availability</Text></TouchableOpacity><AddSlotModal visible={showModal} trainerId={trainerId} existingSlots={allSlots} onClose={()=>setShowModal(false)}/></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},list:{padding:spacing.md,paddingBottom:105},sectionRow:{flexDirection:'row',alignItems:'flex-end',gap:12,marginTop:24,marginBottom:12},sectionTitle:{fontSize:19,fontWeight:'900'},sectionBeam:{flex:1,height:1,backgroundColor:BRAND.blue,opacity:.22,marginBottom:5},daySection:{marginBottom:18},dayHeader:{fontSize:8,fontWeight:'900',letterSpacing:1.5,marginBottom:7},slotRow:{position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderRadius:12,padding:13,marginBottom:7},slotRail:{position:'absolute',left:0,top:0,bottom:0,width:3,opacity:.7},slotTime:{flex:1,fontSize:14,fontWeight:'800'},empty:{borderTopWidth:1,borderBottomWidth:1,paddingVertical:24,alignItems:'center',gap:5},emptyTitle:{fontSize:15,fontWeight:'900'},addBtn:{position:'absolute',right:spacing.md,bottom:spacing.lg,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:BRAND.navy,borderRadius:10,paddingHorizontal:15,paddingVertical:12},addText:{color:'#fff',fontWeight:'900',fontSize:13},modalSafe:{flex:1},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:spacing.md,borderBottomWidth:1},modalTitle:{fontSize:15,fontWeight:'900'},modalContent:{padding:spacing.lg},label:{fontSize:9,fontWeight:'900',letterSpacing:1,marginTop:18,marginBottom:7},dayRow:{flexDirection:'row',flexWrap:'wrap',gap:6},dayBtn:{position:'relative',overflow:'hidden',borderWidth:1,borderRadius:8,paddingHorizontal:10,paddingVertical:8},dayRail:{position:'absolute',left:0,top:0,bottom:0,width:2},input:{borderWidth:1,borderRadius:10,paddingHorizontal:13,paddingVertical:12,fontSize:16}});
