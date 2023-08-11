import React, {useState, useContext, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  FlatList
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ListItem, Text as ElementText, Badge} from 'react-native-elements';
import {ShopSettingsContext} from '../../../contexts/ShopSettingsContext';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { LightningCustodianWallet } from '../../../wallets/lightning-custodian-wallet.js';

const queryLimit = 7;

const RecentInvoices = () => {
  const {navigate} = useNavigation();
  
  const {shopName, lndhub, lndhubUser, shopWallet} = useContext(ShopSettingsContext);
  const [invoices, setInvoices] = useState([]);

  //pagination
  const [queryOffset, setQueryOffset] = useState(0);
  const [queryEndReached, setQueryEndReached] = useState(false);

  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const fetchInvoices = useCallback(async (offset = 0) => {
    console.log('OFFSET', offset);
      try{
        await shopWallet.authorize();
        const foundInvoices = await shopWallet?.getUserInvoices(queryLimit, offset);
        if (foundInvoices && Array.isArray(foundInvoices)) {
          if(invoices.length == foundInvoices.length) setQueryEndReached(true);
          console.log('foundInvoices length', foundInvoices.length)
          setInvoices(foundInvoices);
        }
      } catch(err) {
        console.log(err);
      }

  }, [shopWallet, invoices])

  const onRefresh = () => {

  }

  useEffect(() => {
    console.log('queryOffset', queryOffset);
    fetchInvoices(queryOffset);
  }, [queryOffset])

  useEffect(()=> {
    if(shopWallet) fetchInvoices();

  }, [shopWallet])

  return (
    <>
      <View />
      <View style={{...styles.root, ...backgroundStyle}}>
        <ElementText h3 h3Style={{marginBottom: 20}}>Recent Invocies</ElementText>
        <FlatList
          data={invoices}
          renderItem={({item: inv}) => {
            const date = new Date(inv.timestamp * 1000);
            const formattedDate = date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear();
            return (
              <ListItem bottomDivider onPress={() => navigate('Invoice Detail', {invoice: inv})}>
                <ListItem.Content>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
                    <ListItem.Title>{formattedDate}</ListItem.Title>
                    <ListItem.Subtitle style={{textAlign: 'right'}}>
                      {inv.amt} sats
                    </ListItem.Subtitle>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
                    <ListItem.Subtitle numberOfLines={1} style={{flex: 1}}>{inv.payment_hash}</ListItem.Subtitle>
                    <ListItem.Subtitle style={{textAlign: 'right'}}>
                      {inv.ispaid ? <Badge status="success" value="Paid" /> : <Badge status="warning" value="Unpaid" />}
                    </ListItem.Subtitle>
                  </View>
                </ListItem.Content>
              </ListItem>
            );
          }}
          keyExtractor={(item, index) => index}
          extraData={shopWallet}
          getItemLayout={(data, index) =>(
            {length: 72.5, offset: 72.5 * index, index}
          )}
          onEndReached={() => {
            if(!queryEndReached) setQueryOffset((prevOffset) => prevOffset + queryLimit)
          }}
          onEndReachedThreshold={0.2}
          // onRefresh={onRefresh}
        />
        <View style={{paddingVertical: 30}}></View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginVertical: 10
  },
  saveButton: {
    backgroundColor: '#f90',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#000',
    textAlign: 'center',
  },
});

export default RecentInvoices;