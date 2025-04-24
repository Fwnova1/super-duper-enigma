import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
import joblib
import sys
import argparse
import json
import os

def load_files(model_path, scaler_path):
    """Load model and scaler with error handling."""
    try:
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        return model, scaler
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading files: {e}")
        sys.exit(1)

def prepare_test_data(df, test_size=0.2, random_state=42):
    """Prepare test data from cleaned dataset."""
    try:
        X = df.drop(columns=['encounterId', 'referral'])
        y = df['referral']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        return X_test, y_test
    except KeyError as e:
        print(f"Error: Missing columns in dataset - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error preparing test data: {e}")
        sys.exit(1)

def evaluate_model(model, scaler, X_test, y_test):
    """Evaluate model on test data."""
    try:
        X_test_scaled = scaler.transform(X_test)
        y_pred = model.predict(X_test_scaled)
        
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        conf_matrix = confusion_matrix(y_test, y_pred)
        
        print("\nTest Set Evaluation:")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"F1-Score: {f1:.4f}")
        print("Confusion Matrix:")
        print(conf_matrix)
        print("[[True Negative, False Positive], [False Negative, True Positive]]")
        
        return y_pred
    except Exception as e:
        print(f"Error evaluating model: {e}")
        sys.exit(1)

def predict_new_data(model, scaler, new_data, feature_columns=None):
    """Predict referral for new data (single row or DataFrame)."""
    try:
        if isinstance(new_data, dict):
            # Convert dict to DataFrame
            new_data = pd.DataFrame([new_data])
        elif not isinstance(new_data, pd.DataFrame):
            raise ValueError("new_data must be a DataFrame or dictionary")
        
        # If feature columns were specified, enforce them
        if feature_columns is not None:
            # Create columns that don't exist with default value 0
            for col in feature_columns:
                if col not in new_data.columns:
                    new_data[col] = 0
            
            # Keep only the required features and order them correctly
            new_data = new_data[feature_columns]
        
        # Get only the numeric columns for prediction
        # Remove non-numeric columns and ID columns
        if 'encounterId' in new_data.columns:
            new_data = new_data.drop(columns=['encounterId'])
        if '_id' in new_data.columns:
            new_data = new_data.drop(columns=['_id'])
        
        # Convert all data to numeric, with zeros for any non-numeric values
        for col in new_data.columns:
            new_data[col] = pd.to_numeric(new_data[col], errors='coerce').fillna(0)
        
        # Make sure there are no NaN values
        assert not new_data.isna().any().any(), "Data contains NaN values"
        
        # Scale the data
        try:
            new_data_scaled = scaler.transform(new_data)
            
            # Make prediction
            predictions = model.predict(new_data_scaled)
            
            return predictions
        except Exception as e:
            print(f"Error during scaling/prediction: {e}")
            # Return default predictions (no referral)
            return np.zeros(len(new_data))
        
    except Exception as e:
        print(f"Error predicting new data: {e}")
        return None

def get_feature_columns(model_path, scaler_path):
    """Get the feature columns that the model was trained on."""
    model, scaler = load_files(model_path, scaler_path)
    
    # Try to extract feature names from the scaler or model
    try:
        # This works for many sklearn scalers
        return scaler.feature_names_in_.tolist()
    except:
        # Fallback to these common features in our dataset
        return [
            'bmi', 'end_tidal_co2', 'feed_vol', 'feed_vol_adm', 'fio2',
            'fio2_ratio', 'insp_time', 'oxygen_flow_rate', 'peep', 'pip',
            'resp_rate', 'sip', 'tidal_vol', 'tidal_vol_actual',
            'tidal_vol_kg', 'tidal_vol_spon'
        ]

def main():
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Predict patient referrals using ML model')
    parser.add_argument('--predict-single', type=str, help='JSON string of patient data for prediction')
    parser.add_argument('--predict-batch', type=str, help='Path to JSON file containing multiple patients')
    parser.add_argument('--evaluate', action='store_true', help='Evaluate model on test data')
    parser.add_argument('--model', type=str, default='referral_prediction_model.pkl', help='Path to model file')
    parser.add_argument('--scaler', type=str, default='scaler.pkl', help='Path to scaler file')
    
    args = parser.parse_args()
    
    # File paths
    model_path = args.model
    scaler_path = args.scaler
    
    # Load model and scaler
    model, scaler = load_files(model_path, scaler_path)
    
    # Get feature columns expected by the model
    feature_columns = get_feature_columns(model_path, scaler_path)
    
    # Handle prediction for a single patient
    if args.predict_single:
        try:
            # Parse JSON string into a dict
            patient_data = json.loads(args.predict_single)
            
            # Make prediction
            prediction = predict_new_data(model, scaler, patient_data, feature_columns)
            
            # Print the result as a single line so it can be captured by Node.js
            print(int(prediction[0]))
            
        except Exception as e:
            print(f"Error predicting single patient: {e}")
            print(0)  # Default to no referral on error
    
    # Handle batch prediction
    elif args.predict_batch:
        try:
            # Load patients from JSON file
            with open(args.predict_batch, 'r') as f:
                patients_data = json.load(f)
            
            # Make predictions
            predictions = predict_new_data(model, scaler, pd.DataFrame(patients_data), feature_columns)
            
            # Print results as a list that can be captured by Node.js
            print(predictions.tolist())
            
        except Exception as e:
            print(f"Error batch predicting patients: {e}")
            print([0] * len(patients_data))  # Default to no referrals on error
    
    # Run evaluation if requested
    elif args.evaluate:
        try:
            # Load test data
            csv_path = "Feeding_Dashboard_Cleaned.csv"
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                X_test, y_test = prepare_test_data(df)
                evaluate_model(model, scaler, X_test, y_test)
            else:
                print(f"Error: Test data file {csv_path} not found")
        except Exception as e:
            print(f"Error during evaluation: {e}")
    
    # If no arguments, show help
    else:
        parser.print_help()

if __name__ == "__main__":
    main()