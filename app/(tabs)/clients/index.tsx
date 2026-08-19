import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { EnergyHero } from '@/components/EnergyHero';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useClients } from '@/lib/queries/clients';
import { BRAND, spacing } from '@/lib/theme';
import { useFilteredClients } from '@/lib/useFilteredClients';
import { useTheme } from '@/lib/useTheme';

export default function ClientsList() {
  const router=useRouter(); const {session}=useAuth(); const {colors,accent}=useTheme(); const {data,isLoading,error,isFetching,refetch}=useClients(session?.user.id); const {query,setQuery,results}=useFilteredClients(data??[]);
  if(isLoading)return <View style={[styles.center,{backgroundColor:colors.background}]}><ActivityIndicator/></View>;
  if(error)return <View style={[styles.center,{backgroundColor:colors.background}]}><Text style={{color:colors.danger}}>{(error as Error).message}</Text></View>;
  const isEmpty=(data??[]).length===0;
  return <SafeAreaView style={[styles.safe,{backgroundColor:colors.background}]} edges={['bottom']}>
    <FlatList data={results} keyExtractor={c=>c.id} contentContainerStyle={[styles.list,results.length===0&&{flexGrow:1}]} refreshControl={<RefreshControl refreshing={isFetching&&!isLoading} onRefresh={refetch}/>} ListHeaderComponent={<><EnergyHero eyebrow="YOUR ROSTER" title="Clients" subtitle="See who you’re coaching, what they’re working toward, and where attention is needed." icon="people-outline" compact/>{!isEmpty?<View style={[styles.search,{borderColor:colors.border,backgroundColor:colors.surfaceCard}]}><Ionicons name="search-outline" size={17} color={accent}/><TextInput style={[styles.searchInput,{color:colors.ink}]} value={query} onChangeText={setQuery} placeholder="Search clients…" placeholderTextColor={colors.placeholder} clearButtonMode="while-editing" autoCapitalize="none"/><View style={[styles.searchBeam,{backgroundColor:accent}]}/></View>:null}<View style={styles.sectionRow}><Text style={[styles.sectionTitle,{color:colors.ink}]}>{results.length} client{results.length===1?'':'s'}</Text><View style={styles.sectionBeam}/></View></>} ListEmptyComponent={query?<EmptyState icon="search-outline" title="No matches" subtitle={`No clients match "${query}".`}/>:<EmptyState icon="people-outline" title="No clients yet" subtitle="Add your first client and start scheduling sessions." actionLabel="Add client" onAction={()=>router.push('/(tabs)/clients/new')}/>} renderItem={({item})=><Link href={{pathname:'/(tabs)/clients/[id]',params:{id:item.id}}} asChild><TouchableOpacity style={[styles.row,{backgroundColor:colors.surfaceCard,borderColor:colors.border}]}><View style={[styles.rowRail,{backgroundColor:accent}]}/><Avatar seed={item.user_id} size={42} initial={item.profile?.full_name??item.profile?.email??'Client'}/><View style={styles.rowBody}><Text style={[styles.rowName,{color:colors.ink}]}>{item.profile?.full_name??item.profile?.email??'Unknown'}</Text>{item.goals?<><Text style={[styles.goalEyebrow,{color:accent}]}>CURRENT GOAL</Text><Text style={[styles.rowGoal,{color:colors.muted}]} numberOfLines={1}>{item.goals}</Text></>:null}</View><Ionicons name="arrow-forward" size={16} color={colors.placeholder}/></TouchableOpacity></Link>}/>
    {!isEmpty?<Link href="/(tabs)/clients/new" asChild><TouchableOpacity style={styles.addBtn}><Ionicons name="add" size={17} color="#fff"/><Text style={styles.addText}>Add client</Text></TouchableOpacity></Link>:null}
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},list:{padding:spacing.md,paddingBottom:100},search:{position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderRadius:11,paddingHorizontal:12,marginTop:14},searchInput:{flex:1,paddingVertical:11,fontSize:15},searchBeam:{position:'absolute',left:0,bottom:0,width:90,height:2,opacity:.7},sectionRow:{flexDirection:'row',alignItems:'flex-end',gap:12,marginTop:22,marginBottom:10},sectionTitle:{fontSize:19,fontWeight:'900'},sectionBeam:{flex:1,height:1,backgroundColor:BRAND.blue,opacity:.22,marginBottom:5},row:{position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderRadius:13,padding:14,marginBottom:8},rowRail:{position:'absolute',left:0,top:0,bottom:0,width:3,opacity:.68},rowBody:{flex:1},rowName:{fontSize:15,fontWeight:'900'},goalEyebrow:{fontSize:7,fontWeight:'900',letterSpacing:1,marginTop:5},rowGoal:{fontSize:12,marginTop:1},addBtn:{position:'absolute',right:spacing.md,bottom:24,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:BRAND.navy,borderRadius:10,paddingHorizontal:15,paddingVertical:12},addText:{color:'#fff',fontWeight:'900',fontSize:13}});
