/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import './shim.js';

import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  Button, SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet, Text, TextInput, useColorScheme, View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import {
  Colors
} from 'react-native/Libraries/NewAppScreen';
import QRScanner from './screens/QRScanner';
import { LightningCustodianWallet } from './wallets/lightning-custodian-wallet.js';
  
const alert = (message:string) => {
  Alert.alert(message);
}

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function App(): JSX.Element {
  const fetchInvoiceInterval = useRef();

  const isDarkMode = useColorScheme() === 'dark';
  
  const [scanMode, setScanMode] = useState(false);

  const [lndConnect, setLndConnect] = useState("");
  const [lndUrl, setLndUrl] = useState("");
  const [lndDomain, setLndDomain] = useState("");
  const [lndPort, setLndPort] = useState("");
  const [lndMacaroon, setLndMacaroon] = useState("");
  
  const [inputAmount, setInputAmount] = useState("");
  
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(false);
  
  const [lndInvoice, setLndInvoice] = useState();
  const [invoiceIsPaid, setInvoiceIsPaid] = useState(false);

  const [lndhubUser, setLndhubUser] = useState("");
  const [lndhub, setLndhub] = useState("");
  const [lndWallet, setLndWallet] = useState<LightningCustodianWallet>();

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect( () => {
    console.log('loading wallet ....');
    async function fetchData() {
      // getData('wallet').then(wallet => {
      //   if(wallet) {
      //     setLndWallet(JSON.parse(wallet));
      //   }
      // })
      getData('lndhub').then(hub => {
        setLndhub(hub)
      });
      getData('lndhubUser').then(user => {
        setLndhubUser(user)
      });
    }
    fetchData();

    return () => {
    
    }
    
  }, [])

  useEffect( () => {
    async function initWallet() {
      console.log('initialising wallet...');
      const wallet = new LightningCustodianWallet();
      wallet.setLabel("initialised custodial wallet");
      const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub);
      if (isValidNodeAddress) {
        console.log('isValidNodeAddress...');
        wallet.setBaseURI(lndhub);
        await wallet.init();
      } else {
        throw new Error('The provided node address is not valid LND Hub node.');
      }
      await wallet.setSecret(lndhubUser)
      setLndWallet(wallet);
      
      console.log(wallet);
      console.log('wallet.getID()',wallet.getID());
    }
    if(lndhub && lndhubUser) initWallet();

  },[lndhub, lndhubUser]);

  // const createLightningWallet = async (hub) => {
  //   console.log('creating new wallet...');
  //   const wallet = new LightningCustodianWallet();
  //   wallet.setLabel("initialised custodial wallet");
  //   console.log('connecting to hub new wallet...');
  //   try {
  //     if (lndhub || hub) {
  //       const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub || hub);
  //       if (isValidNodeAddress) {
  //         console.log('isValidNodeAddress...');
  //         wallet.setBaseURI(lndhub);
  //         await wallet.init();
  //       } else {
  //         throw new Error('The provided node address is not valid LND Hub node.');
  //       }
  //     }
  //     else {
  //       alert('set LND Hub first pls.')
  //     }
  //     // console.log('wallet.createAccount()...');
  //     // await wallet.createAccount();
  //     // console.log('wallet.authorize()...');
  //     // await wallet.authorize();
  //   } catch (Err) {
  //     console.warn('lnd create failure', Err);
  //     if (Err.message) {
  //       return alert(Err.message);
  //     } 
  //   }

  //   await wallet.setSecret(lndhubUser)
  //   setLndWallet(wallet);
  //   console.log(wallet);
  //   console.log('wallet.getID()',wallet.getID());
  // };

  const saveToDisk = async (wallet:any) => {
    await storeData('wallet', JSON.stringify(wallet));
  }

  const storeData = async (key:string, value:string) => {
    try {
        await AsyncStorage.setItem(key, value)
    } catch (e:any) {
      console.error(e);
      Toast.show({
        type: 'error',
        text1: 'Store Data Error',
        text2: e.message
      });
    }
  }

  const getData = async (key:string): Promise<string> => {
    try {
      const value = await AsyncStorage.getItem(key)
      if(value !== null) {
        // value previously stored
        return value;
      }
    } catch (e:any) {
      console.error(e);
      Toast.show({
        type: 'error',
        text1: 'Get Data Error',
        text2: e.message
      });
    }
    return "";
  }

  const onScanSuccess = (e: { data: string; }) => {
    if(!e.data.startsWith('lndhub://')) {
      Toast.show({
        type: 'error',
        text1: 'Invalid QR Code',
        text2: 'Please scan your lndconnect QR code'
      });
      console.log('Toast.show');
    }
    else {
      const hubData = e.data.split('@');
      storeData('lndhubUser', hubData[0])
      setLndhubUser(hubData[0]);
      storeData('lndhub', hubData[1])
      setLndhub(hubData[1]);
      
      Toast.show({
        type: 'success',
        text1: 'LND Connect',
        text2: 'Code scanned successfully'
      });
      setScanMode(false);
    }
  };

  const makeLndInvoice = async () => {
    // if(!lndWallet) {
    //   throw new Error('lnd wallet not configured');  
    // }

    // await createLightningWallet();
    console.log('wallet creacted...', lndWallet)
    if(lndWallet) {
      await lndWallet.authorize();
      console.log('inputAmount',inputAmount);
      const result = await lndWallet.addInvoice(parseInt(inputAmount), "test");
      console.log('result', result);
      setLndInvoice(result);
    }

  }

  function bin2String(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
      result += String.fromCharCode(parseInt(array[i], 2));
    }
    return result;
  }

  async function readNdef() {
    try {
      // register for the NFC tag with NDEF in it
      await NfcManager.requestTechnology(NfcTech.Ndef);
      // the resolved tag object will contain `ndefMessage` property
      const tag = await NfcManager.getTag();
      console.log('Tag found', tag);
      console.log('NDEF', tag.ndefMessage[0].payload);
      console.log(String.fromCharCode(...(tag.ndefMessage[0].payload)));
    } catch (ex) {
      console.warn('Oops!', ex);
    } finally {
      // stop the nfc scanning
      NfcManager.cancelTechnologyRequest();
    }
  }


  // useEffect(() => {
  //   BackHandler.addEventListener('hardwareBackPress', handleBackButton);

  //   return () => {
  //     BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
  //     clearInterval(fetchInvoiceInterval.current);
  //     fetchInvoiceInterval.current = undefined;
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);r
  
  useEffect(() => {
    lndWallet?.authorize();
    console.log('LNDViewInvoice - useEffect');
    if (!invoiceIsPaid) {
      fetchInvoiceInterval.current = setInterval(async () => {
        if (isFetchingInvoices && lndWallet) {
          try {
            const userInvoices = await lndWallet.getUserInvoices(20);
            console.log('userInvoices', userInvoices);
            // fetching only last 20 invoices
            // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
            // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
            const updatedUserInvoice = userInvoices.filter(filteredInvoice =>
              typeof lndInvoice === 'object'
                ? filteredInvoice.payment_request === lndInvoice.payment_request
                : filteredInvoice.payment_request === lndInvoice,
            )[0];
            if (typeof updatedUserInvoice !== 'undefined') {
              // setInvoiceStatusChanged(true);
              // setIsLoading(false);
              if (updatedUserInvoice.ispaid) {
                // we fetched the invoice, and it is paid :-)
                setIsFetchingInvoices(false);
                
                // fetchAndSaveWalletTransactions(walletID);
              } else {
                const currentDate = new Date();
                const now = (currentDate.getTime() / 1000) | 0;
                const invoiceExpiration = updatedUserInvoice.timestamp + updatedUserInvoice.expire_time;
                if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
                  // invoice expired :-(
                  // fetchAndSaveWalletTransactions(walletID);
                  setIsFetchingInvoices(false);
                  // ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
                  clearInterval(fetchInvoiceInterval.current);
                  fetchInvoiceInterval.current = undefined;
                }
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
      }, 3000);
    } else {
      setIsFetchingInvoices(false);
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetchingInvoices]);

  return (
    <SafeAreaView >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        >
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Button onPress={() => setScanMode(!scanMode)} title="Scan Mode" />
          {scanMode && <QRScanner onScanSuccess={onScanSuccess} />}
        </View>
        <Text>{lndhubUser}</Text>
        <Text>{lndhub}</Text>
        <TextInput 
          style={{fontSize:40}}
          keyboardType="numeric" 
          placeholder="0.00"
          onChangeText={(text)=>setInputAmount(text)}
        />
        <View style={{padding:20}}>
          <Button onPress={() => makeLndInvoice()} title="Invoice" />
        </View>
        {lndInvoice && <View style={{flexDirection:'column', alignItems: 'center'}}>
          <View style={{padding:20}}>
            <QRCode
              size={300}
              value={lndInvoice}
              // logo={{uri: base64Logo}}
              // logoSize={30}
              // logoBackgroundColor='transparent'
            />
          </View>
          <View style={{padding:20}}>
          <Text>{lndInvoice}</Text>
          </View>
        </View>}
        <View style={{padding:20}}>
          <Button title="Scan a Tag" onPress={readNdef} />
        </View>
        <View style={{padding:20}}>
          <Button title="Fetch invoices" onPress={() => setIsFetchingInvoices(!isFetchingInvoices)} />
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
