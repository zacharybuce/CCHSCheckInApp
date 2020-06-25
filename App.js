//Developer: Zachary Buce
//Mobile application using react native
//This application is meant to provide a curbisde checkin proccess in order to limit the amount of patients coming into the lobby.
//Once the user completes the form, an email will be sent containg the form data.
//The email can be sent to any email address and used the SendGrid API 
//This is a DEMO VERSION that does not actually send an Email

import 'react-native-gesture-handler';
import React,{Component} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, Text, View, ScrollView,Image, Alert, TouchableOpacity, Platform} from 'react-native';
import t from 'tcomb-form-native';
import custom from './custom';
import { sendGridEmail } from 'react-native-sendgrid'
import SplashScreen from 'react-native-splash-screen';
import styled from 'styled-components'
import { render } from 'react-dom';


const Stack = createStackNavigator();
const Form = t.form.Form;

//Hold struct objects(similar to JSON) containing the final form data from each form page. See the handleSubmit class
var parentInfo,petInfo,checkInInfo;

//These are enums that are used in the forms below. "t-comb-form-native" is used to display and handle all form data
//These enums become selectors when integrated into the t-comb form
var Sex = t.enums({Male:'Male',Female:'Female'});
var Type = t.enums({Canine:'Canine',Feline:'Feline',Other:'Other'});
var YN = t.enums({Yes:'Yes',No:'No'});
var Level = t.enums({Normal:'Normal',Increased:'Increased',Decreased:'Decreased'});
var State = t.enums({Alabama: 'Alabama',Alaska:'Alaska',Arizona: 'Arizona',Arkansas:'Arkansas',California: 'California',Colorado: 'Colorado', Connecticut:'Connecticut', Deleware: 'Deleware',
Florida:'Florida',Georgia:'Georgia',Hawaii:'Hawaii',Idaho:'Idaho',Illinois:'Illinois',Indiana:'Indiana',Iowa:'Iowa',Kansas:'Kansas',Kentucky:'Kentucky',Louisiana:'Louisiana',Maine:'Maine',Maryland:'Maryland',
Massachusetts:'Massachusetts',Michigan:'Michigan',Minnesota:'Minnesota',Mississippi:'Mississippi',Missouri:'Missouri',Montana:'Montana',Nebraska:'Nebraska',Nevada:'Nevada',NewHampshire:'New Hampshire',
NewJersey:'New Jersey',NewMexico:'New Mexico',NewYork:'New York',NorthCarolina:'North Carolina',NorthDakota:'North Dakota',Ohio:'Ohio',Oklahoma:'Oklahoma',Oregon:'Oregon',Pennsylvania:'Pennsylvania',RhodeIsland:'Rhode Island',
SouthCarolina:'South Carolina',SouthDakota:'South Dakota',Tennessee:'Tennessee',Texas:'Texas',Utah:'Utah',Vermont:'Vermont',Virginia:'Virginia',Washington:'Washington',WestVirginia:'West Virginia',
Wisconsin:'Wisconsin',Wyoming:'Wyoming'})

//t.structs need to be created in order to create the t-comb form. These will be passed to the <Form /> compontent, 
//which will generate the form

//email validator with regex
var Email = t.refinement(t.String, function(s){
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(s);
});

//phone number validation, must be 10 digits
var Phone = t.refinement(t.Number, function(n){
  
  return n>100000000 && n<9999999999;
});

//This corresponds to the Pet Parent/ owner information. This will be displayed on "first time patient"
const PetParent = t.struct({
  fName:t.String,
  lName:t.String,
  street:t.String,
  city:t.String,
  state:State,
  zip:t.Number,
  email: Email,
  phone:Phone,
  
});

//The pet that the appointment is for. This wil be filled in after the pet parent 
const PetPatient = t.struct({
  name:t.String,
  sex:Sex,
  type:Type,//dog,cat,other
  sn:YN,//spayed/neutured
  breed:t.String,
  color:t.maybe(t.String),
  age:t.Number,
  bd:t.maybe(t.String),//birthdate
  micro:t.maybe(t.String),//microchip#
  problems:t.maybe(t.String)//previous medical/allergies/injuries
});

//The curbside checkin form that corresponds to the appointment
const CheckIn = t.struct({
  parName:t.String,//parent name
  vehicle:t.String,
  phone:Phone,
  petName:t.String,
  type:Type,//dog,cat,other
  reason:t.String,//reason for the vist and concerns
  el:t.maybe(Level),//energy level of pet
  meds:t.maybe(t.String),//list of meds 
  refillMed:t.maybe(YN),//do these meds need refill
  //refillFood:t.maybe(YN),//dose prescription food need refill
  apitite:t.maybe(Level),//apitite level
  water:t.maybe(Level),//water intake
  cough:t.maybe(YN),//coughing?
  sneeze:t.maybe(YN),//Sneezing?
  vomit:t.maybe(YN),//Vomiting?
});

//forms can be given "options" which are descriptors for each field in a form or other modifiers.

const PetParentOptions = {
  fields:{
    fName:{label:'First Name',error:'Required'},
    lName:{label:'Last Name',error:'Required'},
    street:{error:'Required'},
    city:{error:'Required'},
    state:{error:'Required',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    zip:{error:'Required'},
    email:{error:'Not a Valid Email Address'},
    phone:{label:'Phone Number',help:'Enter only numbers',placeholder:'(###)-###-####',error:'Not a valid entry'},
  }
};

//Some of these fields use a custom stylesheet (custom.js)
const PetPatientOptions = {
  fields:{
    name:{label:'Pet Name',error:'Required'},
    sex:{ label:'Sex', error:'Required',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    type:{label:'Pet Type',error:'Required',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    sn:{label:'Spayed/Neutered?',error:'Required',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    breed:{label:'Breed',error:'Required'},
    color:{label:'Color or Markings'},
    age:{label:'Age',error:'Required',help:"If less than 1 years old, put 0"},
    bd:{label:'Birthdate',mode:'date'},
    micro:{label:'Microchip#'},
    problems:{label:'Prior medical problems/allergies/injuries'}
  }
};

//Some of these fields use a custom stylesheet (custom.js)
const CheckInOptions = {
  fields:{
    parName:{label:'Pet Parent Name',error:'Required'},
    vehicle:{label:'Vehicle',error:'Required', help:"Model, Make, and Color"},
    phone:{label:'Mobile Phone',help:'Enter only numbers',placeholder:'(###)-###-####',error:'Not a valid entry'},
    petName:{label:'Pet Name',error:'Required'},
    type:{ label:'Pet Type',error:'Required',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    reason:{label:'Primary Reason for Appointment/Concern',error:'Required'},
    el:{label:'Pet\'s Energy Level',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    meds:{label:'List Medication your pet is Currently Taking'},
    refillMed:{label:'Do you need Refills on any of these Medications',nullOption: {value: '', text: 'Select'},stylesheet:custom},
   // refillFood:{label:'Do you need Refills on any Prescription Pet Food',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    apitite:{label:'Pet\'s Appetite',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    water:{label:'Drinking/Water Intake',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    cough:{label:'Is your Pet Coughing',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    sneeze:{label:'Is your Pet Sneezing',nullOption: {value: '', text: 'Select'},stylesheet:custom},
    vomit:{label:'Is your Pet Vomiting',nullOption: {value: '', text: 'Select'},stylesheet:custom},
  }
};


export default function App() {
  
   // SplashScreen.hide();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Start" component={StartScreen} options = {{headerShown :false}}/>
        <Stack.Screen name="CheckInType" component={CheckInType} options = {{headerShown :false}}/>
        <Stack.Screen name="PetParentInfo" component={PetParentInfo} options = {{headerShown :false}}/>
        <Stack.Screen name="PetPatientInfo" component={PetPatientInfo} options = {{headerShown :false}}/>
        <Stack.Screen name="CurbsideCheckIn" component={CurbsideCheckIn} options = {{headerShown :false}}/>
        <Stack.Screen name="DataTest" component={DataTest} options = {{headerShown :false}}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

//This is the first screen that is shown on boot up. 
//When the button is pressed it navigates to the "CheckInType" Screen
function StartScreen({navigation})
{
  return(
      <View style={styles.container}>
            <Image style = {styles.logo} source={require('./assets/imgs/CHLogo.png')}/>
            <View>
              <MyButton  onPress = {() => navigation.navigate('CheckInType')}>
                <Text style={{fontSize:20,color:'white'}}>Curbside Check-In</Text>
              </MyButton>
            </View>
      </View>
  );
}

//Choosing the first time patient option will make the user fill out the pet parent form 
//Choosing the returning patient will only make the user fill out the curbside form
function CheckInType({navigation})
{
  return(
    <View style={styles.container}>
            <View>
              <MyButton  onPress = {() => navigation.navigate('PetParentInfo')}>
                <Text style={{fontSize:20,color:'white'}}>I am a First Time Patient</Text>
              </MyButton>
              <MyButton style={styles.btn} onPress = {() => navigation.navigate('CurbsideCheckIn')}>
                <Text style={{fontSize:20,color:'white'}}>I am a Returning Patient</Text>
              </MyButton>
            </View>
      </View>
  );
}

//The "CheckInType" function goes here when pressing first time patient
//The form is displyed in the <PetParentForm /> component and passed the navigator refrence
// because functions can not be react child so must be made into a component
function PetParentInfo({navigation})
{
  return(
    <View style={styles.formContainer}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode='on-drag' keyboardShouldPersistTaps = 'always'>
      <Text style ={{padding:10}}></Text>
      <Text style = {{fontSize:35,padding:5,marginBottom:10}}>Pet Parent Information</Text>
      <PetParentForm nav = {navigation}/>
      <Text style ={{padding:20}}></Text>
      </ScrollView>    
    </View>
  );
}

//component that displays the pet parent info form
class PetParentForm extends Component{
  
  //This function is called when the user is finished filling out the form and wants to move on
  //The data the user submitted is put into the parentInfo variable and then navigates to the 
  //pet patient info
  handleSubmit = () => {
    parentInfo = "";
    const value = this._form.getValue(); // use that ref to get the form value
    console.log('value: ', value);
    parentInfo = value;
    if(value){this.props.nav.navigate('PetPatientInfo');}//navigate to next form
    else{Alert.alert("Error","Please enter required fields")}//if the form value is not filled out correctly an error wil appear
  }

  //form display and button
  render(){
    return(
      <View>
      <Form ref={c => this._form = c} type={PetParent} options={PetParentOptions}/>
      <MyButton onPress={this.handleSubmit}>
        <Text style={{fontSize:20,color:'white',textAlign:'center'}}>Continue</Text>
      </MyButton>
      </View>
    );
  }
}

//Pet Parent form navigates to this function on complete.
//<PetPatientForm /> component displays the form
function PetPatientInfo({navigation})
{
  return(
  <View style={styles.formContainer}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode='on-drag' keyboardShouldPersistTaps = 'always'>
      <Text style ={{padding:10}}></Text>
      <Text style = {{fontSize:35,padding:5,marginBottom:10}}>Pet Patient Information</Text>
      <PetPatientForm nav = {navigation}/>
      <Text style ={{padding:20}}></Text>
      </ScrollView>    
    </View>
  );
}


class PetPatientForm extends Component{
  
  //This function is called when the user is finished filling out the form and wants to move on
  //The data the user submitted is put into the petInfo variable and then navigates to the 
  //curbside form 

  handleSubmit = () => {
    petInfo = "";
    const value = this._form.getValue(); // use that ref to get the form value
    console.log('value: ', value);
    petInfo = value;
    if(value){this.props.nav.navigate('CurbsideCheckIn');}
    else{Alert.alert("Error","Please enter required fields")}
  }

  render(){
    return(
      <View>
      <Form ref={c => this._form = c} type={PetPatient} options={PetPatientOptions}/>
      <MyButton onPress={this.handleSubmit}>
        <Text style={{fontSize:20,color:'white',textAlign:'center'}}>Continue</Text>
      </MyButton>
      </View>
    );
  }
}


//If the user chooses returning patient(this assumes the pet and pet parent info are already in system)
//they are navigated to this function. After filling out the first time pet and parent info, they are then navigated here as well.
//Form data is displayed in the <CurbsideForm /> component

function CurbsideCheckIn({navigation})
{
  return(
  <View style={styles.formContainer}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode='on-drag' keyboardShouldPersistTaps = 'always'>
      <Text style ={{padding:10}}></Text>
      <Text style = {{fontSize:Platform.OS=='ios' ? 30:35 ,padding:5,marginBottom:10}}>Curbside Check-In</Text>
      <CurbsideForm nav = {navigation}/>
      <Text style ={{padding:20}}></Text>
      </ScrollView>    
    </View>
  );
}


class CurbsideForm extends Component{

  //When the user is done filling out the form the data is collected and and stored in checkInInfo. Then a confirmation message
  //(defined below) is shown to the user then an email is send through the sendEmail() function
  handleSubmit = () => {
    const value = this._form.getValue(); // use that ref to get the form value
    console.log('value: ', value);
    checkInInfo = value;
    if(value){confirmAlert(this.props.nav);
              //sendEmail(); would at this point send an email 
            }
    else{Alert.alert("Error","Please enter required fields")}
  }

  render(){
    return(
      <View>
      <Form ref={c => this._form = c} type={CheckIn} options={CheckInOptions}/>
      <MyButton onPress={this.handleSubmit}>
        <Text style={{fontSize:20,color:'white',textAlign:'center'}}>Submit</Text>
      </MyButton>
      </View>
    );
  }
}

//This page is soley for testing in order to view the submitted data in the form 
function DataTest({navigation})
{
  return(
      <View style={styles.formContainer}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode='on-drag'>
        <Display />
         
          {/* <Text>Pet Parent Info</Text>
          <Display info={parentInfo}/> 
          <Text>Pet Patient Info</Text>
          <Display info={petInfo}/> 
          <Text>Curbside CheckIn Info</Text>
          <Display info={checkInInfo}/>  */}
          <MyButton onPress={() =>navigation.navigate('Start')}>
            <Text style={{fontSize:20}}>Home Page</Text>
          </MyButton>
        </ScrollView>    
      </View>
    );
}


//This is the function that is triggered when the user finished filling out the forms and causes an email to be sent
//The contents of the email are built in the sendText function
// function sendEmail(){

//    const sendRequest = sendGridEmail(SENDGRIDAPIKEY, TOMEMAIL, FROMEMAIL, SUBJECT, sendText() )
//                 sendRequest.then((response) => {
//                     console.log("Success")
//                 }).catch((error) =>{
//                     console.log(error)
//                 });
// }

//component that is used soley for the testing page. displays the data generated in sendText
class Display extends Component{
  render(){
    return(
    // <Text>{JSON.stringify(this.props.info,null,2)}</Text>
    <Text>{sendText()}</Text>
    );
  }
}

//This alert is displayed when the user successfully fills out the form data. 
//This alert then navigates away from the form back to home page(or data test page)
const confirmAlert = (navigation)=> Alert.alert(
  "Success!",
  "The front desk has recieved your message. Please wait in your vehicle until notified.",
  [{text:"OK",onPress: () => navigation.navigate('DataTest')}],
  {cancelable:false}
);


//This function generates the email body of the email to be sent. 
//plain text email that contains all of the data from the forms.
//attributes are accessed like JSON objects
var sendMessage = "";
function sendText()
{
  if(parentInfo!=undefined)
  {
    var parPhone = parentInfo.phone.toString();
    sendMessage="---New Parent Information---\nName: "+parentInfo.fName+" "+parentInfo.lName+"\n"+
    "Address: "+parentInfo.street+", "+parentInfo.city+", "+parentInfo.state+" "+parentInfo.zip+"\n"+
    "Email: "+parentInfo.email+"\nPhone: ("+parPhone.substring(0,3)+")"+parPhone.substring(3,6)+"-"+parPhone.substring(6)+"\n";

    sendMessage+="\n---New Pet Information---\nName: "+petInfo.name+"\nSex: "+petInfo.sex+"\n"+
    "Pet Type: "+petInfo.type+"\nSpayed or Neutered: "+petInfo.sn+"\n"+
    "Breed: "+petInfo.breed+"\nColor or Markings: "+petInfo.color+"\n"+
    "Age: "+petInfo.age+"\nBirthday: "+petInfo.bd+"\nMicrochip #: "+petInfo.micro+"\n"+
    "Previous medical/allergies/injuries: "+petInfo.problems+"\n";
  }

  var mobPhone = checkInInfo.phone.toString(); 
  sendMessage+="\n---CURBSIDE CHECK-IN FORM---\nPet Parent Name: "+checkInInfo.parName+"\n"+
  "Vehicle: "+checkInInfo.vehicle+"\nPhone Number: ("+mobPhone.substring(0,3)+")"+mobPhone.substring(3,6)+"-"+mobPhone.substring(6)+"\nPet Name: "+
  checkInInfo.petName+"\nPet Type: "+checkInInfo.type+"\nReason for Visit: "+checkInInfo.reason+
  "\nPet Energy Level: "+checkInInfo.el+"\nList of Medications: "+checkInInfo.meds+"\n"+
  "Refill Needed for Medications: "+checkInInfo.refillMed+//"\nRefill Needed for Food: "+checkInInfo.meds+
  "\nPet Appetite Level: "+checkInInfo.apitite+"\nWater Intake: "+checkInInfo.water+"\n"+
  "Pet is Coughing: "+checkInInfo.cough+"\nPet is Sneezing: "+checkInInfo.sneeze+"\n"+
  "Pet is Vomiting: "+checkInInfo.vomit;
  
  return sendMessage;
}

const MyButton = styled.TouchableOpacity`
box-shadow: 1px 3px 0px #91b8b3;
margin: 20px;
background: #3d7d37;
background-color:#4d9d46;
border-radius:5px;
border:1px solid #566963;
font-family:Arial;
font-size:15px;
font-weight:bold;
padding:11px 23px;
text-decoration:none;
text-shadow:0px -1px 0px #2b665e;`

//Styles for non t-comb components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cccccc',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo:{
    width: 200,
    height: 150,
    resizeMode: 'contain'
  },
  btn:{
    
  },
  formContainer:{
    justifyContent: 'center',
    padding: 20,  
  },
});

